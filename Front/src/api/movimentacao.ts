import { api } from "@/api/client"
import type { Movimentacao, TipoMovimentacao } from "@/types"

export interface CreateMovimentacaoPayload {
  tipo: TipoMovimentacao
  quantidade: number
  motivo?: string
}

export async function createMovimentacao(
  produtoId: string,
  payload: CreateMovimentacaoPayload
) {
  const { data } = await api.post<{
    message: string
    movimentacao: Movimentacao
  }>(`/produto/${produtoId}/movimentacao`, payload)
  return data.movimentacao
}

export async function listMovimentacoes(produtoId: string) {
  const { data } = await api.get<{ movimentacoes: Movimentacao[] }>(
    `/produto/${produtoId}/movimentacoes`
  )
  return data.movimentacoes
}
