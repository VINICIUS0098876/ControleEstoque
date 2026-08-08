import { api } from "@/api/client"
import type { Empresa } from "@/types"

export interface CreateEmpresaPayload {
  nome: string
  cnpj: string
  logoUrl?: string
  temaCor?: string
  adminNome: string
  adminEmail: string
  adminSenha: string
}

export interface UpdateEmpresaPayload {
  nome: string
  cnpj: string
  logoUrl?: string
  temaCor?: string
}

export async function createEmpresa(payload: CreateEmpresaPayload) {
  const { data } = await api.post<{ message: string; empresa: Empresa }>(
    "/empresa",
    payload
  )
  return data.empresa
}

export async function getEmpresa() {
  const { data } = await api.get<{ empresa: Empresa }>("/empresa")
  return data.empresa
}

export async function updateEmpresa(payload: UpdateEmpresaPayload) {
  const { data } = await api.put<{ message: string; empresa: Empresa }>(
    "/empresa",
    payload
  )
  return data.empresa
}
