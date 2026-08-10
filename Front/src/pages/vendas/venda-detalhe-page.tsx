import { Link, useParams } from "react-router-dom"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/error-state"
import { useVenda } from "@/hooks/use-vendas"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { isNotFoundError } from "@/api/client"
import { formatCurrency } from "@/lib/format"
import type { FormaPagamento } from "@/types"

const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  CARTAO: "Cartão",
  FIADO: "Fiado",
}

export function VendaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const { data: venda, isLoading, isError, error, refetch } = useVenda(id)
  useDocumentTitle(venda ? format(new Date(venda.criadoEm), "'Venda de' dd/MM/yyyy HH:mm") : "Venda")

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

  if (!venda) {
    return <p className="text-muted-foreground">Venda não encontrada.</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/vendas"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar para vendas
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Venda de {format(new Date(venda.criadoEm), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
        </h1>
        <p className="text-sm text-muted-foreground">
          Vendida por {venda.usuario?.nome ?? "—"}
          {venda.cliente && venda.clienteId && (
            <>
              {" · Cliente: "}
              <Link to={`/clientes/${venda.clienteId}`} className="font-medium text-brand hover:underline">
                {venda.cliente.nome}
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(venda.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Forma de pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{FORMA_PAGAMENTO_LABEL[venda.formaPagamento]}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{venda.itens?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itens vendidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {venda.itens?.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">{item.produto?.nome ?? "Produto"}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantidade} {item.produto?.unidadeMedida ?? "UN"} × {formatCurrency(item.precoUnitario)}
                </p>
              </div>
              <p className="text-sm font-medium">
                {formatCurrency(Number(item.precoUnitario) * item.quantidade)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
