import { api } from "@/api/client"
import type { FormaPagamento, Venda, VendasResponse } from "@/types"

export interface ItemVendaPayload {
  produtoId: string
  quantidade: number
}

export interface CreateVendaPayload {
  formaPagamento: FormaPagamento
  clienteId?: string
  itens: ItemVendaPayload[]
}

export interface ListVendasParams {
  clienteId?: string
  page?: number
  limit?: number
}

export async function createVenda(payload: CreateVendaPayload) {
  const { data } = await api.post<{ message: string; venda: Venda }>("/venda", payload)
  return data.venda
}

export async function listVendas(params: ListVendasParams = {}) {
  const { data } = await api.get<VendasResponse>("/vendas", { params })
  return data
}

export async function getVenda(id: string) {
  const { data } = await api.get<{ venda: Venda }>(`/venda/${id}`)
  return data.venda
}
