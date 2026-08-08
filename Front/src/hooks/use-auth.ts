import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getMe, login as loginRequest, logout as logoutRequest, type LoginPayload } from "@/api/auth"
import { getApiErrorMessage } from "@/api/client"
import { hasSessionHint } from "@/lib/session-hint"
import { useAuthStore } from "@/stores/auth-store"
import { useEmpresaStore } from "@/stores/empresa-store"

export function useAuthBootstrap() {
  const { status, setUsuario, setStatus } = useAuthStore()

  useEffect(() => {
    if (status !== "idle") return

    // Sem o cookie de sessão, não há accessToken/refreshToken pra restaurar:
    // pular a chamada evita um 401 (e o refresh subsequente) garantidos no
    // primeiro carregamento de quem nunca logou ou já deslogou.
    if (!hasSessionHint()) {
      setUsuario(null)
      return
    }

    setStatus("loading")
    getMe()
      .then((usuario) => setUsuario(usuario))
      .catch(() => setUsuario(null))
  }, [status, setUsuario, setStatus])
}

export function useLogin() {
  const setUsuario = useAuthStore((s) => s.setUsuario)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (payload: LoginPayload) => loginRequest(payload),
    onSuccess: (usuario) => {
      setUsuario(usuario)
      navigate("/", { replace: true })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Não foi possível fazer login."))
    },
  })
}

export function useLogout() {
  const reset = useAuthStore((s) => s.reset)
  const setEmpresa = useEmpresaStore((s) => s.setEmpresa)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      reset()
      setEmpresa(null)
      queryClient.clear()
      navigate("/login", { replace: true })
    },
  })
}
