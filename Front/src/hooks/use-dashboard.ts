import { useQuery } from "@tanstack/react-query"
import { listProdutos } from "@/api/produto"
import {
  getResumoEstoque,
  getMovimentacoesPorDia,
  getVendasResumo,
  getVendasPorDia,
  getProdutosMaisVendidos,
  getFiadoResumo,
} from "@/api/dashboard"
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

  const vendas = useQuery({
    queryKey: ["dashboard", "vendas-resumo"],
    queryFn: getVendasResumo,
    enabled: isAuthenticated,
  })

  const fiado = useQuery({
    queryKey: ["dashboard", "fiado-resumo"],
    queryFn: getFiadoResumo,
    enabled: isAuthenticated,
  })

  return { estoqueBaixo, valorEstoque, vendas, fiado }
}

export function useMovimentacoesPorDia(dias: number) {
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated")

  return useQuery({
    queryKey: ["dashboard", "movimentacoes-por-dia", dias],
    queryFn: () => getMovimentacoesPorDia(dias),
    enabled: isAuthenticated,
  })
}

export function useVendasPorDia(dias: number) {
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated")

  return useQuery({
    queryKey: ["dashboard", "vendas-por-dia", dias],
    queryFn: () => getVendasPorDia(dias),
    enabled: isAuthenticated,
  })
}

export function useProdutosMaisVendidos(dias: number, limit = 5) {
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated")

  return useQuery({
    queryKey: ["dashboard", "produtos-mais-vendidos", dias, limit],
    queryFn: () => getProdutosMaisVendidos(dias, limit),
    enabled: isAuthenticated,
  })
}
