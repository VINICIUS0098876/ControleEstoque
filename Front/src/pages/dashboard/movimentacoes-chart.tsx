import { useState } from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { TrendingUp } from "lucide-react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
import { useMovimentacoesPorDia } from "@/hooks/use-dashboard"

const PERIODOS = [
  { label: "Últimos 7 dias", value: 7 },
  { label: "Últimos 30 dias", value: 30 },
  { label: "Últimos 90 dias", value: 90 },
]

function TooltipMovimentacoes({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length || (typeof label !== "string" && typeof label !== "number")) return null

  return (
    <div className="rounded-lg border bg-popover p-2.5 text-xs shadow-md ring-1 ring-foreground/10">
      <p className="mb-1.5 font-medium text-popover-foreground">
        {format(parseISO(String(label)), "dd 'de' MMMM", { locale: ptBR })}
      </p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={String(entry.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-medium text-popover-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MovimentacoesChart() {
  const [dias, setDias] = useState(30)
  const { data, isLoading, isError, refetch } = useMovimentacoesPorDia(dias)

  const totalMovimentado = data?.reduce((acc, item) => acc + item.entradas + item.saidas, 0) ?? 0
  const semMovimentacao = !isLoading && !isError && totalMovimentado === 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Movimentações de estoque</CardTitle>
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

        {semMovimentacao && (
          <EmptyState
            icon={TrendingUp}
            title="Nenhuma movimentação no período"
            description="Registre entradas e saídas de estoque para acompanhar a tendência aqui."
          />
        )}

        {!isLoading && !isError && !semMovimentacao && data && (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip content={TooltipMovimentacoes} cursor={{ stroke: "var(--border)" }} />
              <Legend
                iconType="plainline"
                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
              <Line
                type="monotone"
                dataKey="entradas"
                name="Entradas"
                stroke="var(--chart-entrada)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="saidas"
                name="Saídas"
                stroke="var(--chart-saida)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
