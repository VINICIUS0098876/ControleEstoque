import { api } from "@/api/client"
import type { Usuario } from "@/types"

export interface LoginPayload {
  email: string
  senha: string
}

export async function login(payload: LoginPayload) {
  const { data } = await api.post<{ message: string; usuario: Usuario }>(
    "/user/login",
    payload
  )
  return data.usuario
}

export async function logout() {
  await api.post("/user/logout")
}

export async function getMe() {
  const { data } = await api.get<{ usuario: Usuario }>("/user")
  return data.usuario
}

export interface ForgotPasswordPayload {
  email: string
}

// A API sempre responde com sucesso aqui, exista ou não o e-mail (evita revelar quais
// e-mails têm conta cadastrada) — a mensagem retornada já reflete isso.
export async function forgotPassword(payload: ForgotPasswordPayload) {
  const { data } = await api.post<{ message: string }>("/user/forgot-password", payload)
  return data.message
}

export interface ResetPasswordPayload {
  token: string
  senha: string
}

export async function resetPassword(payload: ResetPasswordPayload) {
  const { data } = await api.post<{ message: string }>("/user/reset-password", payload)
  return data.message
}
