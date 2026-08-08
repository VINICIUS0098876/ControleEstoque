import { api } from "@/api/client"
import type { Produto, ProdutosResponse, ProdutoOrdenavel, OrdemClassificacao } from "@/types"

export interface ListProdutosParams {
  nome?: string
  categoriaId?: string
  estoqueBaixo?: boolean
  page?: number
  limit?: number
  sortBy?: ProdutoOrdenavel
  sortOrder?: OrdemClassificacao
}

export interface ProdutoPayload {
  nome: string
  codigoBarras?: string
  sku?: string
  descricao?: string
  unidadeMedida?: string
  precoCusto: number
  precoVenda: number
  quantidadeAtual?: number
  estoqueMinimo?: number
  imagemUrl?: string
  categoriaId?: string
}

export async function listProdutos(params: ListProdutosParams = {}) {
  const { data } = await api.get<ProdutosResponse>("/produtos", {
    params: {
      ...params,
      estoqueBaixo: params.estoqueBaixo ? "true" : undefined,
    },
  })
  return data
}

export async function getProduto(id: string) {
  const { data } = await api.get<{ produto: Produto }>(`/produto/${id}`)
  return data.produto
}

export async function createProduto(payload: ProdutoPayload) {
  const { data } = await api.post<{ message: string; produto: Produto }>(
    "/produto",
    payload
  )
  return data.produto
}

export async function updateProduto(
  id: string,
  payload: Omit<ProdutoPayload, "quantidadeAtual">
) {
  const { data } = await api.put<{ message: string; produto: Produto }>(
    `/produto/${id}`,
    payload
  )
  return data.produto
}

export async function deleteProduto(id: string) {
  await api.delete(`/produto/${id}`)
}
