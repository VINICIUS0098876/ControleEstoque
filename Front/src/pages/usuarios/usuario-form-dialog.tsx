import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  createUsuarioSchema,
  editUsuarioSchema,
  type CreateUsuarioFormValues,
  type EditUsuarioFormValues,
} from "@/schemas/usuario.schema"
import { useAdminUpdateUsuario, useCreateUsuario } from "@/hooks/use-usuarios"
import type { Usuario } from "@/types"

interface UsuarioFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Presente = edita nome/e-mail desse funcionário (AdminUpdateUsuarioService no back).
  // Ausente = cadastra um novo (sempre como FUNCIONARIO, ver CreateFuncionarioService).
  // Em nenhum dos dois casos a senha é definida aqui fora da criação: redefinição é um
  // fluxo separado (ver botão "Redefinir senha" em usuarios-page.tsx).
  usuario?: Usuario | null
}

export function UsuarioFormDialog({ open, onOpenChange, usuario = null }: UsuarioFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {usuario ? (
        <EditUsuarioDialogContent usuario={usuario} onOpenChange={onOpenChange} />
      ) : (
        <CreateUsuarioDialogContent open={open} onOpenChange={onOpenChange} />
      )}
    </Dialog>
  )
}

const createDefaultValues: CreateUsuarioFormValues = { nome: "", email: "", senha: "" }

interface CreateUsuarioDialogContentProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateUsuarioDialogContent({ open, onOpenChange }: CreateUsuarioDialogContentProps) {
  const createUsuario = useCreateUsuario()

  const form = useForm<CreateUsuarioFormValues>({
    resolver: zodResolver(createUsuarioSchema),
    defaultValues: createDefaultValues,
  })

  useEffect(() => {
    if (open) form.reset(createDefaultValues)
  }, [open, form])

  function onSubmit(values: CreateUsuarioFormValues) {
    createUsuario.mutate(values, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo funcionário</DialogTitle>
        <DialogDescription>
          Cria uma conta de acesso com permissões restritas (sem gerenciar usuários ou configurações
          da empresa).
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="funcionario@empresa.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="senha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha provisória</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" {...field} />
                </FormControl>
                <FormDescription>Compartilhe com o funcionário — ele pode trocá-la depois no perfil dele.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createUsuario.isPending}>
              {createUsuario.isPending ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  )
}

interface EditUsuarioDialogContentProps {
  usuario: Usuario
  onOpenChange: (open: boolean) => void
}

function EditUsuarioDialogContent({ usuario, onOpenChange }: EditUsuarioDialogContentProps) {
  const adminUpdateUsuario = useAdminUpdateUsuario()

  const form = useForm<EditUsuarioFormValues>({
    resolver: zodResolver(editUsuarioSchema),
    // "values" (em vez de "defaultValues") mantém o formulário sincronizado se o
    // usuário-alvo mudar (reabrir o diálogo pra editar outra pessoa), sem precisar de
    // um efeito manual de reset — mesmo padrão usado em perfil-page.tsx.
    values: { nome: usuario.nome, email: usuario.email },
  })

  function onSubmit(values: EditUsuarioFormValues) {
    adminUpdateUsuario.mutate({ id: usuario.id, ...values }, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar funcionário</DialogTitle>
        <DialogDescription>Atualiza o nome e o e-mail de login de {usuario.nome}.</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="funcionario@empresa.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={adminUpdateUsuario.isPending}>
              {adminUpdateUsuario.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  )
}
