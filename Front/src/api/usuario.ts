import { api } from "@/api/client"
import type { Usuario } from "@/types"

export interface CreateUsuarioPayload {
  nome: string
  email: string
  senha: string
}

export interface UpdateUsuarioPayload {
  nome: string
  email: string
}

export async function createUsuario(payload: CreateUsuarioPayload) {
  const { data } = await api.post<{ message: string; usuario: Usuario }>(
    "/user",
    payload
  )
  return data.usuario
}

export interface PatchPasswordPayload {
  senha: string
  senhaAntiga: string
}

export async function updateUsuario(payload: UpdateUsuarioPayload) {
  const { data } = await api.put<{ message: string; usuario: Usuario }>(
    "/user",
    payload
  )
  return data.usuario
}

export async function patchPassword(payload: PatchPasswordPayload) {
  const { data } = await api.patch<{ message: string; usuario: Usuario }>(
    "/user/password",
    payload
  )
  return data.usuario
}

export async function deleteUsuario() {
  await api.delete("/user")
}

export async function listUsuarios() {
  const { data } = await api.get<{ usuarios: Usuario[] }>("/users")
  return data.usuarios
}

export async function reactivateUsuario(id: string) {
  const { data } = await api.patch<{ message: string; usuario: Usuario }>(
    `/user/${id}/reactivate`
  )
  return data.usuario
}

export async function deactivateUsuario(id: string) {
  const { data } = await api.patch<{ message: string; usuario: Usuario }>(
    `/user/${id}/deactivate`
  )
  return data.usuario
}

export interface AdminUpdateUsuarioPayload {
  id: string
  nome: string
  email: string
}

export async function adminUpdateUsuario({ id, ...payload }: AdminUpdateUsuarioPayload) {
  const { data } = await api.put<{ message: string; usuario: Usuario }>(
    `/user/${id}`,
    payload
  )
  return data.usuario
}

export interface AdminResetPasswordResult {
  id: string
  nome: string
  email: string
  senhaProvisoria: string
}

export async function adminResetPassword(id: string) {
  const { data } = await api.patch<{ message: string; usuario: AdminResetPasswordResult }>(
    `/user/${id}/reset-password`
  )
  return data.usuario
}
