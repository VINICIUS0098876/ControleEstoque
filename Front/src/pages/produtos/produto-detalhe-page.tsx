import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, ArrowRightLeft, Pencil, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/error-state"
import { ProdutoImagem } from "@/components/produto-imagem"
import { useProduto } from "@/hooks/use-produtos"
import { useMovimentacoes } from "@/hooks/use-movimentacoes"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { isNotFoundError } from "@/api/client"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ProdutoFormDialog } from "@/pages/produtos/produto-form-dialog"
import { MovimentacaoDialog } from "@/pages/produtos/movimentacao-dialog"

const tipoBadgeVariant: Record<string, string> = {
  ENTRADA: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  SAIDA: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  ESTORNO: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
}

export function ProdutoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const { data: produto, isLoading, isError, error, refetch } = useProduto(id)
  const {
    data: movimentacoes,
    isLoading: isLoadingMovimentacoes,
    isError: isErrorMovimentacoes,
    refetch: refetchMovimentacoes,
  } = useMovimentacoes(id)
  useDocumentTitle(produto?.nome)

  const [formOpen, setFormOpen] = useState(false)
  const [movimentacaoOpen, setMovimentacaoOpen] = useState(false)

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

  if (!produto) {
    return <p className="text-muted-foreground">Produto não encontrado.</p>
  }

  const estoqueBaixo = produto.quantidadeAtual <= produto.estoqueMinimo

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ProdutoImagem src={produto.imagemUrl} alt="" className="size-14" />
          <div>
            <Link
              to="/produtos"
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Voltar para produtos
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">{produto.nome}</h1>
            {produto.categoria?.nome && (
              <p className="text-sm text-muted-foreground">{produto.categoria.nome}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setFormOpen(true)}>
            <Pencil className="size-4" />
            Editar
          </Button>
          <Button className="gap-1.5" onClick={() => setMovimentacaoOpen(true)}>
            <ArrowRightLeft className="size-4" />
            Movimentar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Estoque atual</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "flex items-center gap-1.5 text-2xl font-semibold",
                estoqueBaixo && "text-destructive"
              )}
            >
              {estoqueBaixo && <AlertTriangle className="size-5" />}
              {produto.quantidadeAtual} {produto.unidadeMedida}
            </p>
            <p className="text-xs text-muted-foreground">Mínimo: {produto.estoqueMinimo}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Preço de venda</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(produto.precoVenda)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Preço de custo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(produto.precoCusto)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">SKU</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{produto.sku || "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de movimentações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingMovimentacoes && <Skeleton className="h-24 w-full" />}

          {isErrorMovimentacoes && <ErrorState onRetry={() => refetchMovimentacoes()} />}

          {!isLoadingMovimentacoes && !isErrorMovimentacoes && movimentacoes?.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma movimentação registrada ainda.
            </p>
          )}

          {movimentacoes?.map((mov) => (
            <div
              key={mov.id}
              className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className={cn("border-0", tipoBadgeVariant[mov.tipo])}>
                  {mov.tipo}
                </Badge>
                <div>
                  <p className="text-sm font-medium">
                    {mov.tipo === "SAIDA" ? "-" : "+"}
                    {mov.quantidade} {produto.unidadeMedida}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mov.motivo || "Sem motivo informado"}
                    {mov.usuario?.nome ? ` · ${mov.usuario.nome}` : ""}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(mov.criadoEm), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <ProdutoFormDialog open={formOpen} onOpenChange={setFormOpen} produto={produto} />
      <MovimentacaoDialog open={movimentacaoOpen} onOpenChange={setMovimentacaoOpen} produto={produto} />
    </div>
  )
}
