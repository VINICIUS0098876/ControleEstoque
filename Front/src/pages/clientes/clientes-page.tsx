import { useState } from "react"
import { Link } from "react-router-dom"
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Contact,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react"
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
import type { ClienteOrdenavel } from "@/api/cliente"
import { useClientes, useDeleteCliente } from "@/hooks/use-clientes"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Cliente, OrdemClassificacao } from "@/types"
import { ClienteFormDialog } from "@/pages/clientes/cliente-form-dialog"

interface CabecalhoOrdenavelProps {
  label: string
  coluna: ClienteOrdenavel
  sortBy: ClienteOrdenavel
  sortOrder: OrdemClassificacao
  onOrdenar: (coluna: ClienteOrdenavel) => void
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

export function ClientesPage() {
  useDocumentTitle("Clientes")

  const [busca, setBusca] = useState("")
  const buscaFiltro = useDebouncedValue(busca, 400)
  const [page, setPage] = useState(1)
  const [ordenacao, setOrdenacao] = useState<{ sortBy: ClienteOrdenavel; sortOrder: OrdemClassificacao }>({
    sortBy: "nome",
    sortOrder: "asc",
  })
  const { sortBy, sortOrder } = ordenacao

  const { data, isLoading, isError, refetch, isPlaceholderData } = useClientes({
    busca: buscaFiltro || undefined,
    page,
    limit: 20,
    sortBy,
    sortOrder,
  })
  const deleteCliente = useDeleteCliente()

  const [formOpen, setFormOpen] = useState(false)
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null)
  // Mesmo padrão de produtos-page.tsx/categorias-page.tsx: clienteParaExcluir só é
  // sobrescrito ao abrir uma nova exclusão, nunca ao fechar — evita "undefined" piscando
  // na descrição durante a animação de saída do AlertDialog.
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null)
  const [excluirDialogOpen, setExcluirDialogOpen] = useState(false)

  function abrirNovo() {
    setClienteEmEdicao(null)
    setFormOpen(true)
  }

  function abrirEdicao(cliente: Cliente) {
    setClienteEmEdicao(cliente)
    setFormOpen(true)
  }

  function abrirExclusao(cliente: Cliente) {
    setClienteParaExcluir(cliente)
    setExcluirDialogOpen(true)
  }

  function alternarOrdenacao(coluna: ClienteOrdenavel) {
    setOrdenacao((atual) =>
      atual.sortBy === coluna
        ? { sortBy: coluna, sortOrder: atual.sortOrder === "asc" ? "desc" : "asc" }
        : { sortBy: coluna, sortOrder: "asc" }
    )
    setPage(1)
  }

  const semFiltrosAtivos = !buscaFiltro

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} cliente(s) cadastrado(s)` : "Gerencie os clientes da sua empresa"}
          </p>
        </div>
        <Button onClick={abrirNovo} className="gap-1.5">
          <Plus className="size-4" />
          Novo cliente
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setPage(1)
          }}
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
                <TableHead>
                  <CabecalhoOrdenavel
                    label="Nome"
                    coluna="nome"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onOrdenar={alternarOrdenacao}
                  />
                </TableHead>
                <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                <TableHead className="hidden md:table-cell">Limite de fiado</TableHead>
                <TableHead>
                  <CabecalhoOrdenavel
                    label="Saldo devedor"
                    coluna="saldoDevedor"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onOrdenar={alternarOrdenacao}
                  />
                </TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {!isLoading && data?.clientes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    {semFiltrosAtivos ? (
                      <EmptyState
                        icon={Contact}
                        title="Nenhum cliente cadastrado ainda"
                        description="Cadastre clientes para vender fiado e acompanhar o saldo devedor de cada um."
                        action={
                          <Button size="sm" className="gap-1.5" onClick={abrirNovo}>
                            <Plus className="size-4" />
                            Cadastrar meu primeiro cliente
                          </Button>
                        }
                      />
                    ) : (
                      <EmptyState
                        icon={Search}
                        title="Nenhum cliente encontrado"
                        description="Tente ajustar a busca."
                      />
                    )}
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                data?.clientes.map((cliente) => {
                  const saldo = cliente.saldoDevedor ?? 0
                  const temSaldoDevedor = saldo > 0
                  return (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">
                        <Link to={`/clientes/${cliente.id}`} className="hover:text-brand hover:underline">
                          {cliente.nome}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{cliente.telefone || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {cliente.limiteCredito ? formatCurrency(cliente.limiteCredito) : "Sem limite"}
                      </TableCell>
                      <TableCell className={cn(temSaldoDevedor && "font-medium text-destructive")}>
                        {formatCurrency(saldo)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Editar"
                          aria-label={`Editar ${cliente.nome}`}
                          onClick={() => abrirEdicao(cliente)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={
                            temSaldoDevedor
                              ? "Quite o saldo devedor antes de excluir este cliente"
                              : "Excluir"
                          }
                          aria-label={`Excluir ${cliente.nome}`}
                          className="text-destructive hover:text-destructive"
                          disabled={temSaldoDevedor}
                          onClick={() => abrirExclusao(cliente)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
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

      <ClienteFormDialog open={formOpen} onOpenChange={setFormOpen} cliente={clienteEmEdicao} />

      {/* O botão de excluir já fica desabilitado com saldo devedor em aberto (ver
          coluna Ações acima), então este diálogo só é alcançável com saldo zerado — a
          mensagem não precisa mais cobrir o caso "tem dívida". */}
      <ConfirmDialog
        open={excluirDialogOpen}
        onOpenChange={setExcluirDialogOpen}
        title="Excluir cliente"
        description={`Tem certeza que deseja excluir "${clienteParaExcluir?.nome}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        isPending={deleteCliente.isPending}
        onConfirm={() =>
          clienteParaExcluir &&
          deleteCliente.mutate(clienteParaExcluir.id, {
            onSuccess: () => setExcluirDialogOpen(false),
          })
        }
      />
    </div>
  )
}
