import { api } from "@/api/client"
import type { MovimentacaoPorDia, ProdutoMaisVendido, ResumoFiado, ResumoVendas, VendaPorDia } from "@/types"

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

export async function getVendasResumo() {
  const { data } = await api.get<ResumoVendas>("/dashboard/vendas-resumo")
  return data
}

export async function getVendasPorDia(dias = 30) {
  const { data } = await api.get<{ vendas: VendaPorDia[] }>("/dashboard/vendas-por-dia", {
    params: { dias },
  })
  return data.vendas
}

export async function getProdutosMaisVendidos(dias = 30, limit = 5) {
  const { data } = await api.get<{ produtos: ProdutoMaisVendido[] }>(
    "/dashboard/produtos-mais-vendidos",
    { params: { dias, limit } }
  )
  return data.produtos
}

export async function getFiadoResumo() {
  const { data } = await api.get<ResumoFiado>("/dashboard/fiado-resumo")
  return data
}
