import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { AlertTriangle, Boxes, DollarSign, HandCoins, Receipt, RefreshCw, TrendingUp, Wallet } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/error-state"
import { Sparkline } from "@/components/sparkline"
import { useDashboard, useProdutosMaisVendidos } from "@/hooks/use-dashboard"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth-store"
import { MovimentacoesChart } from "@/pages/dashboard/movimentacoes-chart"
import { VendasChart } from "@/pages/dashboard/vendas-chart"

const DIAS_MAIS_VENDIDOS = 30

interface StatCardProps {
  title: string
  icon: LucideIcon
  iconClassName?: string
  valueClassName?: string
  isLoading: boolean
  isError?: boolean
  onRetry?: () => void
  value?: ReactNode
  // Série curta (ex: últimos 7 dias) para o sparkline ao lado do valor. Opcional de
  // propósito: só "Produtos cadastrados" tem histórico diário real disponível hoje (o
  // valor em estoque e o total de itens com estoque baixo são só o instantâneo atual,
  // sem série histórica no banco) — não faz sentido inventar uma tendência pros outros.
  tendencia?: number[]
  to?: string
}

function StatCard({
  title,
  icon: Icon,
  iconClassName,
  valueClassName,
  isLoading,
  isError,
  onRetry,
  value,
  tendencia,
  to,
}: StatCardProps) {
  const conteudo = (
    <Card className={cn(to && !isError && "transition-colors hover:bg-muted/50")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("size-4 text-muted-foreground", iconClassName)} />
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-8 w-16" />}
        {!isLoading && isError && (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Erro ao carregar</p>
            {onRetry && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Tentar novamente"
                onClick={(e) => {
                  e.preventDefault()
                  onRetry()
                }}
              >
                <RefreshCw className="size-3.5" />
              </Button>
            )}
          </div>
        )}
        {!isLoading && !isError && (
          <div className="flex items-end justify-between gap-3">
            <p className={cn("text-2xl font-semibold", valueClassName)}>{value}</p>
            {tendencia && tendencia.length > 1 && <Sparkline data={tendencia} className="h-8 w-20" />}
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (!to) return conteudo

  return (
    <Link to={to} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {conteudo}
    </Link>
  )
}

export function DashboardPage() {
  useDocumentTitle("Dashboard")

  const usuario = useAuthStore((s) => s.usuario)
  const { estoqueBaixo, valorEstoque, vendas, fiado } = useDashboard()
  const maisVendidos = useProdutosMaisVendidos(DIAS_MAIS_VENDIDOS, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {usuario?.nome?.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Resumo de vendas e estoque da sua empresa.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Faturamento hoje"
          icon={Wallet}
          isLoading={vendas.isLoading}
          isError={vendas.isError}
          onRetry={() => vendas.refetch()}
          value={formatCurrency(vendas.data?.faturamentoHoje ?? 0)}
          tendencia={vendas.data?.tendenciaFaturamento.map((dia) => dia.total)}
          to="/vendas"
        />

        <StatCard
          title="Vendas hoje"
          icon={Receipt}
          isLoading={vendas.isLoading}
          isError={vendas.isError}
          onRetry={() => vendas.refetch()}
          value={vendas.data?.quantidadeVendasHoje ?? 0}
          to="/vendas"
        />

        <StatCard
          title="Fiado a receber"
          icon={HandCoins}
          isLoading={fiado.isLoading}
          isError={fiado.isError}
          onRetry={() => fiado.refetch()}
          value={formatCurrency(fiado.data?.totalReceber ?? 0)}
          to="/clientes"
        />

        <StatCard
          title="Produtos cadastrados"
          icon={Boxes}
          isLoading={valorEstoque.isLoading}
          isError={valorEstoque.isError}
          onRetry={() => valorEstoque.refetch()}
          value={valorEstoque.data?.totalProdutos ?? 0}
          tendencia={valorEstoque.data?.tendenciaProdutos.map((dia) => dia.total)}
          to="/produtos"
        />

        <StatCard
          title="Com estoque baixo"
          icon={AlertTriangle}
          iconClassName="text-destructive"
          valueClassName="text-destructive"
          isLoading={estoqueBaixo.isLoading}
          isError={estoqueBaixo.isError}
          onRetry={() => estoqueBaixo.refetch()}
          value={estoqueBaixo.data?.total ?? 0}
          to="/produtos"
        />

        <StatCard
          title="Valor em estoque (custo)"
          icon={DollarSign}
          isLoading={valorEstoque.isLoading}
          isError={valorEstoque.isError}
          onRetry={() => valorEstoque.refetch()}
          value={formatCurrency(valorEstoque.data?.valorCusto ?? 0)}
          to="/produtos"
        />

        <StatCard
          title="Valor em estoque (venda)"
          icon={TrendingUp}
          isLoading={valorEstoque.isLoading}
          isError={valorEstoque.isError}
          onRetry={() => valorEstoque.refetch()}
          value={formatCurrency(valorEstoque.data?.valorVenda ?? 0)}
          to="/produtos"
        />
      </div>

      <VendasChart />

      <MovimentacoesChart />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Produtos com estoque baixo</CardTitle>
            <Button asChild variant="link" size="sm" className="text-brand">
              <Link to="/produtos">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {estoqueBaixo.isLoading && <Skeleton className="h-24 w-full" />}

            {estoqueBaixo.isError && <ErrorState onRetry={() => estoqueBaixo.refetch()} />}

            {!estoqueBaixo.isLoading && !estoqueBaixo.isError && estoqueBaixo.data?.produtos.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum produto com estoque baixo. 🎉
              </p>
            )}

            {estoqueBaixo.data?.produtos.map((produto) => (
              <Link
                key={produto.id}
                to={`/produtos/${produto.id}`}
                className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted"
              >
                <span className="font-medium">{produto.nome}</span>
                <span className="text-destructive">
                  {produto.quantidadeAtual} / {produto.estoqueMinimo} {produto.unidadeMedida}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Mais vendidos (30 dias)</CardTitle>
            <Button asChild variant="link" size="sm" className="text-brand">
              <Link to="/vendas">Ver vendas</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {maisVendidos.isLoading && <Skeleton className="h-24 w-full" />}

            {maisVendidos.isError && <ErrorState onRetry={() => maisVendidos.refetch()} />}

            {!maisVendidos.isLoading && !maisVendidos.isError && maisVendidos.data?.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma venda registrada nos últimos {DIAS_MAIS_VENDIDOS} dias.
              </p>
            )}

            {maisVendidos.data?.map((produto, indice) => (
              <Link
                key={produto.produtoId}
                to={`/produtos/${produto.produtoId}`}
                className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {indice + 1}
                  </span>
                  <span className="truncate font-medium">{produto.nome}</span>
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {produto.quantidadeVendida} {produto.unidadeMedida}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
