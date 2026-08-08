import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  PackageSearch,
  MoreVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { ProdutoImagem } from "@/components/produto-imagem"
import { useProdutos, useDeleteProduto } from "@/hooks/use-produtos"
import { useCategorias } from "@/hooks/use-categorias"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Produto, ProdutoOrdenavel, OrdemClassificacao } from "@/types"
import { ProdutoFormDialog } from "@/pages/produtos/produto-form-dialog"
import { MovimentacaoDialog } from "@/pages/produtos/movimentacao-dialog"

const TODAS_CATEGORIAS = "__todas__"

// Em telas menores nem todas as colunas cabem sem rolagem horizontal. Em vez de encolher
// tudo (texto ilegível) ou depender só do scroll, as colunas de apoio somem progressivamente
// e as essenciais (produto, estoque, preço, ações) continuam sempre visíveis.
const RESPONSIVE_COLUMN_CLASSES: Partial<Record<string, string>> = {
  sku: "hidden md:table-cell",
  categoria: "hidden lg:table-cell",
}

const columnHelper = createColumnHelper<Produto>()

interface CabecalhoOrdenavelProps {
  label: string
  coluna: ProdutoOrdenavel
  sortBy: ProdutoOrdenavel
  sortOrder: OrdemClassificacao
  onOrdenar: (coluna: ProdutoOrdenavel) => void
}

function CabecalhoOrdenavel({ label, coluna, sortBy, sortOrder, onOrdenar }: CabecalhoOrdenavelProps) {
  const ativo = sortBy === coluna
  return (
    <button
      type="button"
      onClick={() => onOrdenar(coluna)}
      className="inline-flex items-center gap-1 text-left hover:text-foreground"
    >
      {label}
      {ativo && sortOrder === "asc" && <ArrowUp className="size-3.5" />}
      {ativo && sortOrder === "desc" && <ArrowDown className="size-3.5" />}
      {!ativo && <ArrowUpDown className="size-3.5 text-muted-foreground/50" />}
    </button>
  )
}

export function ProdutosPage() {
  useDocumentTitle("Produtos")

  const [busca, setBusca] = useState("")
  const nomeFiltro = useDebouncedValue(busca, 400)
  const [categoriaId, setCategoriaId] = useState<string>(TODAS_CATEGORIAS)
  const [estoqueBaixo, setEstoqueBaixo] = useState(false)
  const [page, setPage] = useState(1)
  const [ordenacao, setOrdenacao] = useState<{ sortBy: ProdutoOrdenavel; sortOrder: OrdemClassificacao }>({
    sortBy: "nome",
    sortOrder: "asc",
  })
  const { sortBy, sortOrder } = ordenacao

  const semFiltrosAtivos = !nomeFiltro && categoriaId === TODAS_CATEGORIAS && !estoqueBaixo

  const { data: categorias } = useCategorias()
  const { data, isLoading, isError, refetch, isPlaceholderData } = useProdutos({
    nome: nomeFiltro || undefined,
    categoriaId: categoriaId === TODAS_CATEGORIAS ? undefined : categoriaId,
    estoqueBaixo,
    page,
    limit: 10,
    sortBy,
    sortOrder,
  })
  const deleteProduto = useDeleteProduto()

  const [formOpen, setFormOpen] = useState(false)
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null)
  // O produto e o "aberto" do diálogo de exclusão são estados separados de propósito:
  // o AlertDialog mantém o conteúdo montado durante a animação de saída, então se
  // produtoParaExcluir fosse zerado junto com o fechamento, a descrição piscaria
  // "undefined" nesse intervalo. produtoParaExcluir só é sobrescrito ao abrir uma nova
  // exclusão, nunca ao fechar.
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(null)
  const [excluirDialogOpen, setExcluirDialogOpen] = useState(false)
  const [produtoParaMovimentar, setProdutoParaMovimentar] = useState<Produto | null>(null)

  // Permite abrir o formulário de criação via link/navegação (?novo=1) — usado pela
  // ação "Novo produto" do command palette. O parâmetro é removido em seguida, pra
  // voltar/avançar no histórico do navegador não reabrir o diálogo sem querer.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get("novo") !== "1") return

    setProdutoEmEdicao(null)
    setFormOpen(true)
    setSearchParams(
      (atual) => {
        const proximos = new URLSearchParams(atual)
        proximos.delete("novo")
        return proximos
      },
      { replace: true }
    )
  }, [searchParams, setSearchParams])

  function abrirNovo() {
    setProdutoEmEdicao(null)
    setFormOpen(true)
  }

  function abrirEdicao(produto: Produto) {
    setProdutoEmEdicao(produto)
    setFormOpen(true)
  }

  function abrirExclusao(produto: Produto) {
    setProdutoParaExcluir(produto)
    setExcluirDialogOpen(true)
  }

  // useCallback (identidade estável) para não invalidar o useMemo de `columns` a cada
  // render — só muda de fato quando a ordenação em si muda, via seu próprio dep abaixo.
  const alternarOrdenacao = useCallback((coluna: ProdutoOrdenavel) => {
    setOrdenacao((atual) =>
      atual.sortBy === coluna
        ? { sortBy: coluna, sortOrder: atual.sortOrder === "asc" ? "desc" : "asc" }
        : { sortBy: coluna, sortOrder: "asc" }
    )
    setPage(1)
  }, [])

  const columns = useMemo(
    () => [
      columnHelper.accessor("nome", {
        header: () => (
          <CabecalhoOrdenavel
            label="Produto"
            coluna="nome"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onOrdenar={alternarOrdenacao}
          />
        ),
        cell: (info) => (
          <Link
            to={`/produtos/${info.row.original.id}`}
            className="flex min-w-0 max-w-28 items-center gap-2.5 font-medium hover:text-brand hover:underline sm:max-w-none"
          >
            {/* Miniatura só a partir de sm: no menor breakpoint a coluna de ações
                (essencial) tem prioridade sobre a miniatura (decorativa) no espaço
                disponível — ver RESPONSIVE_COLUMN_CLASSES acima. */}
            <ProdutoImagem
              src={info.row.original.imagemUrl}
              alt=""
              className="hidden size-8 shrink-0 sm:flex"
            />
            <span className="truncate">{info.getValue()}</span>
          </Link>
        ),
      }),
      columnHelper.accessor("sku", {
        header: "SKU",
        cell: (info) => info.getValue() || <span className="text-muted-foreground">—</span>,
      }),
      columnHelper.accessor((row) => row.categoria?.nome, {
        id: "categoria",
        header: "Categoria",
        cell: (info) => info.getValue() || <span className="text-muted-foreground">—</span>,
      }),
      columnHelper.accessor("quantidadeAtual", {
        header: () => (
          <CabecalhoOrdenavel
            label="Estoque"
            coluna="quantidadeAtual"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onOrdenar={alternarOrdenacao}
          />
        ),
        cell: (info) => {
          const produto = info.row.original
          const baixo = produto.quantidadeAtual <= produto.estoqueMinimo
          return (
            <span className={cn("inline-flex items-center gap-1", baixo && "text-destructive font-medium")}>
              {baixo && <AlertTriangle className="size-3.5" />}
              {produto.quantidadeAtual} {produto.unidadeMedida}
            </span>
          )
        },
      }),
      columnHelper.accessor("precoVenda", {
        header: () => (
          <CabecalhoOrdenavel
            label="Preço"
            coluna="precoVenda"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onOrdenar={alternarOrdenacao}
          />
        ),
        cell: (info) => formatCurrency(info.getValue()),
      }),
      columnHelper.display({
        id: "acoes",
        header: () => <span className="sr-only">Ações</span>,
        cell: (info) => {
          const produto = info.row.original
          return (
            <div className="flex justify-end">
              {/* Telas sm+ têm espaço de sobra pros três ícones lado a lado. Abaixo
                  disso (mobile), com a coluna Categoria/SKU já ocultas, os três botões
                  ainda espremeriam a linha — por isso viram um menu "mais ações". */}
              <div className="hidden items-center gap-1 sm:flex">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Registrar movimentação"
                  aria-label={`Registrar movimentação de ${produto.nome}`}
                  onClick={() => setProdutoParaMovimentar(produto)}
                >
                  <ArrowRightLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Editar"
                  aria-label={`Editar ${produto.nome}`}
                  onClick={() => abrirEdicao(produto)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Excluir"
                  aria-label={`Excluir ${produto.nome}`}
                  className="text-destructive hover:text-destructive"
                  onClick={() => abrirExclusao(produto)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Mais ações para ${produto.nome}`}
                    className="sm:hidden"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setProdutoParaMovimentar(produto)}>
                    <ArrowRightLeft className="size-4" />
                    Registrar movimentação
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => abrirEdicao(produto)}>
                    <Pencil className="size-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => abrirExclusao(produto)}>
                    <Trash2 className="size-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      }),
    ],
    [sortBy, sortOrder, alternarOrdenacao]
  )

  const table = useReactTable({
    data: data?.produtos ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.totalPages ?? 1,
  })

  const movimentacoesDoExcluido = produtoParaExcluir?._count?.movimentacoes ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} produto(s) cadastrado(s)` : "Gerencie seu estoque"}
          </p>
        </div>
        <Button onClick={abrirNovo} className="gap-1.5">
          <Plus className="size-4" />
          Novo produto
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setPage(1)
            }}
            className="pl-8"
          />
        </div>

        <Select
          value={categoriaId}
          onValueChange={(value) => {
            setCategoriaId(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS_CATEGORIAS}>Todas as categorias</SelectItem>
            {categorias?.map((categoria) => (
              <SelectItem key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={estoqueBaixo ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setEstoqueBaixo((v) => !v)
            setPage(1)
          }}
        >
          <AlertTriangle className="size-4" />
          Estoque baixo
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
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className={RESPONSIVE_COLUMN_CLASSES[header.column.id]}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={columns.length}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {!isLoading && data?.produtos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    {semFiltrosAtivos ? (
                      <EmptyState
                        icon={PackageSearch}
                        title="Nenhum produto cadastrado ainda"
                        description="Comece cadastrando o primeiro produto do seu estoque."
                        action={
                          <Button size="sm" className="gap-1.5" onClick={abrirNovo}>
                            <Plus className="size-4" />
                            Cadastrar meu primeiro produto
                          </Button>
                        }
                      />
                    ) : (
                      <EmptyState
                        icon={Search}
                        title="Nenhum produto encontrado"
                        description="Tente ajustar a busca ou os filtros aplicados."
                      />
                    )}
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={RESPONSIVE_COLUMN_CLASSES[cell.column.id]}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {data.page} de {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isPlaceholderData}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages || isPlaceholderData}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <ProdutoFormDialog open={formOpen} onOpenChange={setFormOpen} produto={produtoEmEdicao} />

      {produtoParaMovimentar && (
        <MovimentacaoDialog
          open={!!produtoParaMovimentar}
          onOpenChange={(open) => !open && setProdutoParaMovimentar(null)}
          produto={produtoParaMovimentar}
        />
      )}

      <ConfirmDialog
        open={excluirDialogOpen}
        onOpenChange={setExcluirDialogOpen}
        title="Excluir produto"
        description={
          movimentacoesDoExcluido > 0
            ? `Tem certeza que deseja excluir "${produtoParaExcluir?.nome}"? Esse produto tem ${movimentacoesDoExcluido} movimentação(ões) registrada(s) que permanecerão no histórico. Essa ação não pode ser desfeita.`
            : `Tem certeza que deseja excluir "${produtoParaExcluir?.nome}"? Essa ação não pode ser desfeita.`
        }
        confirmLabel="Excluir"
        isPending={deleteProduto.isPending}
        onConfirm={() =>
          produtoParaExcluir &&
          deleteProduto.mutate(produtoParaExcluir.id, {
            onSuccess: () => setExcluirDialogOpen(false),
          })
        }
      />
    </div>
  )
}
