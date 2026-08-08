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
