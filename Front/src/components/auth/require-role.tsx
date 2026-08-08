import { useEffect } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { toast } from "sonner"
import { useAuthStore } from "@/stores/auth-store"
import type { Papel } from "@/types"

interface RequireRoleProps {
  papeisPermitidos: Papel[]
}

// Guard de rota por papel. Deve ficar sempre aninhado dentro de <ProtectedRoute> (que já
// garante usuario != null quando renderiza o <Outlet />). Genérico de propósito: hoje só
// protege rotas ADMIN-only (ver AdminRoute), mas qualquer papel/rota futura reaproveita
// este mesmo componente em vez de duplicar a checagem.
export function RequireRole({ papeisPermitidos }: RequireRoleProps) {
  const usuario = useAuthStore((s) => s.usuario)
  const permitido = !!usuario && papeisPermitidos.includes(usuario.papel)

  useEffect(() => {
    if (!permitido) {
      // id fixo: em StrictMode (dev), o React monta o efeito duas vezes (mount ->
      // cleanup -> mount) de propósito, pra expor efeitos não-idempotentes. Sem um id,
      // as duas chamadas criariam dois toasts empilhados; com id, a segunda chamada
      // só atualiza o toast já aberto pela primeira.
      toast.error("Você não tem permissão para acessar essa página.", { id: "require-role-denied" })
    }
  }, [permitido])

  if (!permitido) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
