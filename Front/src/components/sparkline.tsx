import { useId } from "react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"

interface SparklineProps {
  data: number[]
  className?: string
}

// Mini-gráfico de tendência para acompanhar um número dentro de um StatCard — sem eixos,
// grid ou tooltip, só a forma da curva. Usa a cor de marca do tenant (var(--brand)) pra
// ficar visualmente coerente com o resto da identidade white-label (ver index.css).
export function Sparkline({ data, className }: SparklineProps) {
  const gradientId = useId()
  const pontos = data.map((valor, indice) => ({ indice, valor }))

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pontos} margin={{ top: 2, right: 1, bottom: 2, left: 1 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="valor"
            stroke="var(--brand)"
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
