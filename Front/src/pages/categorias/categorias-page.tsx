import { useState } from "react"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { Plus, Search, Pencil, Trash2, Tags } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { useCategorias, useDeleteCategoria } from "@/hooks/use-categorias"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { CategoriaFormDialog } from "@/pages/categorias/categoria-form-dialog"
import type { Categoria } from "@/types"

export function CategoriasPage() {
  useDocumentTitle("Categorias")

  const [busca, setBusca] = useState("")
  const nomeFiltro = useDebouncedValue(busca, 400)

  const { data: categorias, isLoading, isError, refetch } = useCategorias({ nome: nomeFiltro || undefined })
  const deleteCategoria = useDeleteCategoria()

  const [formOpen, setFormOpen] = useState(false)
  const [categoriaEmEdicao, setCategoriaEmEdicao] = useState<Categoria | null>(null)
  // A categoria e o "aberto" do diálogo de exclusão são estados separados de propósito:
  // o AlertDialog mantém o conteúdo montado durante a animação de saída, então se
  // categoriaParaExcluir fosse zerada junto com o fechamento, a descrição piscaria
  // "undefined" nesse intervalo. categoriaParaExcluir só é sobrescrita ao abrir uma nova
  // exclusão, nunca ao fechar.
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<Categoria | null>(null)
  const [excluirDialogOpen, setExcluirDialogOpen] = useState(false)

  function abrirNova() {
    setCategoriaEmEdicao(null)
    setFormOpen(true)
  }

  function abrirEdicao(categoria: Categoria) {
    setCategoriaEmEdicao(categoria)
    setFormOpen(true)
  }

  function abrirExclusao(categoria: Categoria) {
    setCategoriaParaExcluir(categoria)
    setExcluirDialogOpen(true)
  }

  const produtosDaExcluida = categoriaParaExcluir?._count?.produtos ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground">Organize seus produtos em categorias.</p>
        </div>
        <Button onClick={abrirNova} className="gap-1.5">
          <Plus className="size-4" />
          Nova categoria
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-8"
        />
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
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={2}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {!isLoading && categorias?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2}>
                    {nomeFiltro ? (
                      <EmptyState
                        icon={Search}
                        title="Nenhuma categoria encontrada"
                        description="Tente ajustar a busca."
                      />
                    ) : (
                      <EmptyState
                        icon={Tags}
                        title="Nenhuma categoria cadastrada ainda"
                        description="Categorias ajudam a organizar e filtrar seus produtos."
                        action={
                          <Button size="sm" className="gap-1.5" onClick={abrirNova}>
                            <Plus className="size-4" />
                            Criar minha primeira categoria
                          </Button>
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              )}

              {categorias?.map((categoria) => (
                <TableRow key={categoria.id}>
                  <TableCell className="font-medium">{categoria.nome}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Editar"
                      aria-label={`Editar ${categoria.nome}`}
                      onClick={() => abrirEdicao(categoria)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Excluir"
                      aria-label={`Excluir ${categoria.nome}`}
                      className="text-destructive hover:text-destructive"
                      onClick={() => abrirExclusao(categoria)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CategoriaFormDialog open={formOpen} onOpenChange={setFormOpen} categoria={categoriaEmEdicao} />

      <ConfirmDialog
        open={excluirDialogOpen}
        onOpenChange={setExcluirDialogOpen}
        title="Excluir categoria"
        description={
          produtosDaExcluida > 0
            ? `Tem certeza que deseja excluir "${categoriaParaExcluir?.nome}"? ${produtosDaExcluida} produto(s) vinculado(s) perderão a categoria.`
            : `Tem certeza que deseja excluir "${categoriaParaExcluir?.nome}"?`
        }
        confirmLabel="Excluir"
        isPending={deleteCategoria.isPending}
        onConfirm={() =>
          categoriaParaExcluir &&
          deleteCategoria.mutate(categoriaParaExcluir.id, {
            onSuccess: () => setExcluirDialogOpen(false),
          })
        }
      />
    </div>
  )
}
