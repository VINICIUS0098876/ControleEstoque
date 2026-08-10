import { api } from "@/api/client"
import type { Cliente, ClientesResponse, PagamentoFiado } from "@/types"

export type ClienteOrdenavel = "nome" | "saldoDevedor"

export interface ListClientesParams {
  busca?: string
  page?: number
  limit?: number
  sortBy?: ClienteOrdenavel
  sortOrder?: "asc" | "desc"
}

export interface ClientePayload {
  nome: string
  telefone?: string
  limiteCredito?: number
}

export async function listClientes(params: ListClientesParams = {}) {
  const { data } = await api.get<ClientesResponse>("/clientes", { params })
  return data
}

export async function getCliente(id: string) {
  const { data } = await api.get<{ cliente: Cliente }>(`/cliente/${id}`)
  return data.cliente
}

export async function createCliente(payload: ClientePayload) {
  const { data } = await api.post<{ message: string; cliente: Cliente }>("/cliente", payload)
  return data.cliente
}

export async function updateCliente(id: string, payload: ClientePayload) {
  const { data } = await api.put<{ message: string; cliente: Cliente }>(`/cliente/${id}`, payload)
  return data.cliente
}

export async function deleteCliente(id: string) {
  await api.delete(`/cliente/${id}`)
}

export async function createPagamentoFiado(clienteId: string, valor: number) {
  const { data } = await api.post<{ message: string; pagamento: PagamentoFiado }>(
    `/cliente/${clienteId}/pagamento`,
    { valor }
  )
  return data.pagamento
}

export async function listPagamentosFiado(clienteId: string) {
  const { data } = await api.get<{ pagamentos: PagamentoFiado[] }>(`/cliente/${clienteId}/pagamentos`)
  return data.pagamentos
}
