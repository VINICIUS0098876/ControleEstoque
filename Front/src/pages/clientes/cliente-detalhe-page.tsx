import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, HandCoins, ShoppingBag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/error-state"
import { useCliente, usePagamentosFiado } from "@/hooks/use-clientes"
import { useVendas } from "@/hooks/use-vendas"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { isNotFoundError } from "@/api/client"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { PagamentoFiadoDialog } from "@/pages/clientes/pagamento-fiado-dialog"

interface ExtratoItem {
  id: string
  tipo: "compra" | "pagamento"
  valor: number
  data: string
}

export function ClienteDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const { data: cliente, isLoading, isError, error, refetch } = useCliente(id)
  // clienteId aqui só devolve vendas FIADO na prática: é o único caso em que o front
  // manda clienteId ao criar uma venda (ver pdv-page.tsx) — mesmo que o back aceite o
  // vínculo pra qualquer forma de pagamento.
  const { data: vendasFiado, isLoading: isLoadingVendas } = useVendas({ clienteId: id, limit: 100 })
  const { data: pagamentos, isLoading: isLoadingPagamentos } = usePagamentosFiado(id)
  useDocumentTitle(cliente?.nome ?? "Cliente")

  const [pagamentoOpen, setPagamentoOpen] = useState(false)

  // Compras (débito) e pagamentos (crédito) vêm de duas rotas diferentes — combinados e
  // ordenados por data aqui pra formar um extrato único, como um mini-extrato bancário.
  const extrato = useMemo<ExtratoItem[]>(() => {
    const compras: ExtratoItem[] = (vendasFiado?.vendas ?? []).map((venda) => ({
      id: venda.id,
      tipo: "compra",
      valor: Number(venda.total),
      data: venda.criadoEm,
    }))
    const creditos: ExtratoItem[] = (pagamentos ?? []).map((pagamento) => ({
      id: pagamento.id,
      tipo: "pagamento",
      valor: Number(pagamento.valor),
      data: pagamento.criadoEm,
    }))
    return [...compras, ...creditos].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  }, [vendasFiado, pagamentos])

  const carregandoExtrato = isLoadingVendas || isLoadingPagamentos

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isError && !isNotFoundError(error)) {
    return <ErrorState onRetry={() => refetch()} />
  }

  if (!cliente) {
    return <p className="text-muted-foreground">Cliente não encontrado.</p>
  }

  const saldo = cliente.saldoDevedor ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/clientes"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar para clientes
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{cliente.nome}</h1>
          {cliente.telefone && <p className="text-sm text-muted-foreground">{cliente.telefone}</p>}
        </div>
        <Button className="gap-1.5" onClick={() => setPagamentoOpen(true)}>
          <HandCoins className="size-4" />
          Registrar pagamento
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Saldo devedor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-semibold", saldo > 0 && "text-destructive")}>
              {formatCurrency(saldo)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Limite de fiado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {cliente.limiteCredito ? formatCurrency(cliente.limiteCredito) : "Sem limite"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Extrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {carregandoExtrato && <Skeleton className="h-24 w-full" />}

          {!carregandoExtrato && extrato.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma compra fiado ou pagamento registrado ainda.
            </p>
          )}

          {extrato.map((item) => (
            <div
              key={`${item.tipo}-${item.id}`}
              className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className={cn(
                    "gap-1 border-0",
                    item.tipo === "compra"
                      ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                  )}
                >
                  {item.tipo === "compra" ? (
                    <ShoppingBag className="size-3" />
                  ) : (
                    <HandCoins className="size-3" />
                  )}
                  {item.tipo === "compra" ? "Compra fiado" : "Pagamento"}
                </Badge>
                <p className="text-sm font-medium">
                  {item.tipo === "compra" ? "+" : "−"}
                  {formatCurrency(item.valor)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(item.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <PagamentoFiadoDialog open={pagamentoOpen} onOpenChange={setPagamentoOpen} cliente={cliente} />
    </div>
  )
}
