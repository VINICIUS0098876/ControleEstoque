import { api } from "@/api/client"
import type { MovimentacaoPorDia } from "@/types"

export interface ProdutoPorDia {
  data: string
  total: number
}

export interface ResumoEstoque {
  totalProdutos: number
  valorCusto: number
  valorVenda: number
  tendenciaProdutos: ProdutoPorDia[]
}

export async function getResumoEstoque() {
  const { data } = await api.get<ResumoEstoque>("/dashboard/resumo")
  return data
}

export async function getMovimentacoesPorDia(dias = 30) {
  const { data } = await api.get<{ movimentacoes: MovimentacaoPorDia[] }>(
    "/dashboard/movimentacoes-por-dia",
    { params: { dias } }
  )
  return data.movimentacoes
}
