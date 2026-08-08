import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

// Access/refresh tokens vivem em cookies httpOnly (setados pelo back), então aqui só
// disparamos o refresh e deixamos o navegador reenviar o cookie novo automaticamente.
let refreshPromise: Promise<void> | null = null

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/user/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined
    const isAuthRoute =
      originalRequest?.url?.includes("/user/login") ||
      originalRequest?.url?.includes("/user/refresh")

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRoute
    ) {
      originalRequest._retry = true

      try {
        await refreshSession()
        return api(originalRequest)
      } catch {
        window.dispatchEvent(new CustomEvent("auth:logout"))
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export function getApiErrorMessage(error: unknown, fallback = "Ocorreu um erro inesperado."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined
    if (data?.message) return data.message

    // A requisição saiu mas nenhuma resposta chegou (servidor fora do ar, sem rede,
    // CORS bloqueando, timeout) — não é o mesmo tipo de falha que um 4xx/5xx com
    // mensagem da API, então merece uma mensagem própria em vez do fallback genérico.
    if (!error.response) {
      return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."
    }
  }
  return fallback
}

// Distingue "não existe" de "falhou ao carregar" — um 404 não deve oferecer "tentar
// novamente" (o recurso segue não existindo), diferente de um erro de rede/servidor.
export function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404
}
