import { useState } from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Receipt } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { TooltipContentProps } from "recharts"
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { useVendasPorDia } from "@/hooks/use-dashboard"
import { formatCurrency } from "@/lib/format"

const PERIODOS = [
  { label: "Últimos 7 dias", value: 7 },
  { label: "Últimos 30 dias", value: 30 },
  { label: "Últimos 90 dias", value: 90 },
]

function TooltipVendas({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length || (typeof label !== "string" && typeof label !== "number")) return null

  const [entry] = payload
  const quantidade = entry?.payload?.quantidade as number | undefined

  return (
    <div className="rounded-lg border bg-popover p-2.5 text-xs shadow-md ring-1 ring-foreground/10">
      <p className="mb-1 font-medium text-popover-foreground">
        {format(parseISO(String(label)), "dd 'de' MMMM", { locale: ptBR })}
      </p>
      <p className="text-popover-foreground">{formatCurrency(Number(entry?.value ?? 0))}</p>
      {typeof quantidade === "number" && (
        <p className="text-muted-foreground">
          {quantidade} {quantidade === 1 ? "venda" : "vendas"}
        </p>
      )}
    </div>
  )
}

// Faturamento por dia (soma de Venda.total) — irmão de MovimentacoesChart, mas em card
// separado de propósito: unidades diferentes (dinheiro vs. quantidade de itens) num
// mesmo eixo Y confundiriam mais do que ajudariam.
export function VendasChart() {
  const [dias, setDias] = useState(30)
  const { data, isLoading, isError, refetch } = useVendasPorDia(dias)

  const faturamentoTotal = data?.reduce((acc, item) => acc + item.total, 0) ?? 0
  const semVendas = !isLoading && !isError && faturamentoTotal === 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Faturamento</CardTitle>
        <Select value={String(dias)} onValueChange={(value) => setDias(Number(value))}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODOS.map((periodo) => (
              <SelectItem key={periodo.value} value={String(periodo.value)}>
                {periodo.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-64 w-full" />}

        {isError && <ErrorState onRetry={() => refetch()} />}

        {semVendas && (
          <EmptyState
            icon={Receipt}
            title="Nenhuma venda no período"
            description="Vendas registradas no PDV aparecem aqui."
          />
        )}

        {!isLoading && !isError && !semVendas && data && (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="vendas-chart-gradiente" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="data"
                tickFormatter={(value: string) => format(parseISO(value), "dd/MM")}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(value: number) => formatCurrency(value)}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <Tooltip content={TooltipVendas} cursor={{ stroke: "var(--border)" }} />
              <Area
                type="monotone"
                dataKey="total"
                name="Faturamento"
                stroke="var(--brand)"
                strokeWidth={2}
                fill="url(#vendas-chart-gradiente)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
