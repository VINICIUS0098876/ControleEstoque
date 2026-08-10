import { useState } from "react"
import { Link } from "react-router-dom"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { useVendas } from "@/hooks/use-vendas"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatCurrency } from "@/lib/format"
import type { FormaPagamento } from "@/types"

const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  CARTAO: "Cartão",
  FIADO: "Fiado",
}

export function VendasPage() {
  useDocumentTitle("Vendas")

  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch, isPlaceholderData } = useVendas({ page, limit: 20 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vendas</h1>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total} venda(s) registrada(s)` : "Histórico de vendas do PDV"}
        </p>
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
                <TableHead>Data</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {!isLoading && data?.vendas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState
                      icon={Receipt}
                      title="Nenhuma venda registrada ainda"
                      description="Vendas feitas no PDV aparecem aqui."
                      action={
                        <Button size="sm" className="gap-1.5" asChild>
                          <Link to="/pdv">Ir para o PDV</Link>
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                data?.vendas.map((venda) => (
                  <TableRow key={venda.id}>
                    <TableCell>
                      <Link
                        to={`/vendas/${venda.id}`}
                        className="font-medium hover:text-brand hover:underline"
                      >
                        {format(new Date(venda.criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </Link>
                    </TableCell>
                    <TableCell>{venda.usuario?.nome ?? "—"}</TableCell>
                    <TableCell>{venda._count?.itens ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{FORMA_PAGAMENTO_LABEL[venda.formaPagamento]}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(venda.total)}</TableCell>
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
    </div>
  )
}
