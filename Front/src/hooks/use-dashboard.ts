import { useQuery } from "@tanstack/react-query"
import { listProdutos } from "@/api/produto"
import { getResumoEstoque, getMovimentacoesPorDia } from "@/api/dashboard"
import { useAuthStore } from "@/stores/auth-store"

export function useDashboard() {
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated")

  const estoqueBaixo = useQuery({
    queryKey: ["dashboard", "estoque-baixo"],
    queryFn: () => listProdutos({ estoqueBaixo: true, limit: 5 }),
    enabled: isAuthenticated,
  })

  const valorEstoque = useQuery({
    queryKey: ["dashboard", "resumo"],
    queryFn: getResumoEstoque,
    enabled: isAuthenticated,
  })

  return { estoqueBaixo, valorEstoque }
}

export function useMovimentacoesPorDia(dias: number) {
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated")

  return useQuery({
    queryKey: ["dashboard", "movimentacoes-por-dia", dias],
    queryFn: () => getMovimentacoesPorDia(dias),
    enabled: isAuthenticated,
  })
}
