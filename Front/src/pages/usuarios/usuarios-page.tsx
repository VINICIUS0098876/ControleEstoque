import { useState } from "react"
import { Copy, KeyRound, Pencil, Plus, RotateCcw, UserX, Users } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import {
  useAdminResetPassword,
  useDeactivateUsuario,
  useReactivateUsuario,
  useUsuarios,
} from "@/hooks/use-usuarios"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { useAuthStore } from "@/stores/auth-store"
import { UsuarioFormDialog } from "@/pages/usuarios/usuario-form-dialog"
import type { Usuario } from "@/types"

export function UsuariosPage() {
  useDocumentTitle("Usuários")

  const { data: usuarios, isLoading, isError, refetch } = useUsuarios()
  const reactivate = useReactivateUsuario()
  const deactivate = useDeactivateUsuario()
  const resetPassword = useAdminResetPassword()
  const usuarioLogado = useAuthStore((s) => s.usuario)

  const [formOpen, setFormOpen] = useState(false)
  // null = cadastro de um novo funcionário; preenchido = edição desse funcionário
  // (ver UsuarioFormDialog). Só é sobrescrito ao abrir uma nova ação, nunca ao fechar
  // o diálogo, pelo mesmo motivo do usuarioParaDesativar logo abaixo.
  const [usuarioParaEditar, setUsuarioParaEditar] = useState<Usuario | null>(null)

  // Usuário e "aberto" do diálogo de confirmação são estados separados de propósito: o
  // AlertDialog mantém o conteúdo montado durante a animação de saída, então se
  // usuarioParaDesativar fosse zerado junto com o fechamento, a descrição piscaria
  // "undefined" nesse intervalo. usuarioParaDesativar só é sobrescrito ao abrir uma nova
  // confirmação, nunca ao fechar.
  const [usuarioParaDesativar, setUsuarioParaDesativar] = useState<Usuario | null>(null)
  const [desativarDialogOpen, setDesativarDialogOpen] = useState(false)

  const [usuarioParaResetarSenha, setUsuarioParaResetarSenha] = useState<Usuario | null>(null)
  const [resetSenhaDialogOpen, setResetSenhaDialogOpen] = useState(false)
  // Guarda a senha provisória só entre a resposta do reset e o ADMIN fechar esse
  // diálogo — não é persistida em nenhum lugar, é a única vez que ela aparece em texto puro.
  const [senhaGerada, setSenhaGerada] = useState<{ nome: string; senha: string } | null>(null)

  function abrirCadastro() {
    setUsuarioParaEditar(null)
    setFormOpen(true)
  }

  function abrirEdicao(usuario: Usuario) {
    setUsuarioParaEditar(usuario)
    setFormOpen(true)
  }

  function copiarSenha() {
    if (!senhaGerada) return
    navigator.clipboard.writeText(senhaGerada.senha)
    toast.success("Senha copiada.")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">Pessoas com acesso ao estoque da sua empresa.</p>
        </div>
        <Button onClick={abrirCadastro} className="gap-1.5">
          <Plus className="size-4" />
          Novo funcionário
        </Button>
      </div>

      {isError ? (
        <div className="rounded-lg border bg-card">
          <ErrorState onRetry={() => refetch()} />
        </div>
      ) : (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-36 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && usuarios?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState icon={Users} title="Nenhum usuário encontrado" />
                </TableCell>
              </TableRow>
            )}

            {usuarios?.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell className="font-medium">
                  {usuario.nome}
                  {usuario.id === usuarioLogado?.id && (
                    <span className="ml-1.5 text-xs text-muted-foreground">(você)</span>
                  )}
                </TableCell>
                <TableCell>{usuario.email}</TableCell>
                <TableCell>{usuario.papel}</TableCell>
                <TableCell>
                  <Badge variant={usuario.ativo ? "success" : "outline"}>
                    {usuario.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {!usuario.ativo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      disabled={reactivate.isPending}
                      onClick={() => reactivate.mutate(usuario.id)}
                    >
                      <RotateCcw className="size-4" />
                      Reativar
                    </Button>
                  )}
                  {/* Sem ações de edição/reset/desativação sobre a própria conta por
                      aqui: cada um ajusta os próprios dados em /perfil. */}
                  {usuario.ativo && usuario.id !== usuarioLogado?.id && (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Editar dados"
                        aria-label={`Editar dados de ${usuario.nome}`}
                        onClick={() => abrirEdicao(usuario)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Redefinir senha"
                        aria-label={`Redefinir senha de ${usuario.nome}`}
                        onClick={() => {
                          setUsuarioParaResetarSenha(usuario)
                          setResetSenhaDialogOpen(true)
                        }}
                      >
                        <KeyRound className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        title="Desativar"
                        aria-label={`Desativar ${usuario.nome}`}
                        onClick={() => {
                          setUsuarioParaDesativar(usuario)
                          setDesativarDialogOpen(true)
                        }}
                      >
                        <UserX className="size-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}

      <UsuarioFormDialog open={formOpen} onOpenChange={setFormOpen} usuario={usuarioParaEditar} />

      <ConfirmDialog
        open={desativarDialogOpen}
        onOpenChange={setDesativarDialogOpen}
        title="Desativar usuário"
        description={`Tem certeza que deseja desativar "${usuarioParaDesativar?.nome}"? A sessão dele é encerrada na hora e o acesso ao sistema é bloqueado imediatamente. Você pode reativar depois, quando quiser.`}
        confirmLabel="Desativar"
        isPending={deactivate.isPending}
        onConfirm={() =>
          usuarioParaDesativar &&
          deactivate.mutate(usuarioParaDesativar.id, {
            onSuccess: () => setDesativarDialogOpen(false),
          })
        }
      />

      <ConfirmDialog
        open={resetSenhaDialogOpen}
        onOpenChange={setResetSenhaDialogOpen}
        title="Redefinir senha"
        description={`Uma nova senha provisória será gerada para "${usuarioParaResetarSenha?.nome}" e a sessão atual dele será encerrada. Você poderá copiá-la na tela seguinte para repassar a ele.`}
        confirmLabel="Redefinir"
        isPending={resetPassword.isPending}
        onConfirm={() =>
          usuarioParaResetarSenha &&
          resetPassword.mutate(usuarioParaResetarSenha.id, {
            onSuccess: (resultado) => {
              setResetSenhaDialogOpen(false)
              setSenhaGerada({ nome: resultado.nome, senha: resultado.senhaProvisoria })
            },
          })
        }
      />

      <Dialog open={senhaGerada !== null} onOpenChange={(open) => !open && setSenhaGerada(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Senha redefinida</DialogTitle>
            <DialogDescription>
              Copie a senha abaixo e repasse a {senhaGerada?.nome}. Ela só é exibida agora — não será
              mostrada novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={senhaGerada?.senha ?? ""} className="font-mono" />
            <Button type="button" variant="outline" size="icon" aria-label="Copiar senha" onClick={copiarSenha}>
              <Copy className="size-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setSenhaGerada(null)}>
              Concluído
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
