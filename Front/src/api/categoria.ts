import { api } from "@/api/client"
import type { Categoria } from "@/types"

export interface ListCategoriasParams {
  nome?: string
}

export interface CategoriaPayload {
  nome: string
}

export async function listCategorias(params: ListCategoriasParams = {}) {
  const { data } = await api.get<{ categorias: Categoria[] }>("/categorias", {
    params,
  })
  return data.categorias
}

export async function getCategoria(id: string) {
  const { data } = await api.get<{ categoria: Categoria }>(`/categoria/${id}`)
  return data.categoria
}

export async function createCategoria(payload: CategoriaPayload) {
  const { data } = await api.post<{ message: string; categoria: Categoria }>(
    "/categoria",
    payload
  )
  return data.categoria
}

export async function updateCategoria(id: string, payload: CategoriaPayload) {
  const { data } = await api.put<{ message: string; categoria: Categoria }>(
    `/categoria/${id}`,
    payload
  )
  return data.categoria
}

export async function deleteCategoria(id: string) {
  await api.delete(`/categoria/${id}`)
}
