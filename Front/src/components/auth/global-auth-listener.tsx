import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/stores/auth-store"
import { useEmpresaStore } from "@/stores/empresa-store"

// O client Axios dispara esse evento quando o refresh token falha (sessão expirada),
// então aqui a gente limpa o estado local e manda o usuário de volta pro login.
export function GlobalAuthListener() {
  const reset = useAuthStore((s) => s.reset)
  const setEmpresa = useEmpresaStore((s) => s.setEmpresa)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    function handleLogout() {
      reset()
      setEmpresa(null)
      queryClient.clear()
      navigate("/login", { replace: true })
    }

    window.addEventListener("auth:logout", handleLogout)
    return () => window.removeEventListener("auth:logout", handleLogout)
  }, [reset, setEmpresa, navigate, queryClient])

  return null
}
