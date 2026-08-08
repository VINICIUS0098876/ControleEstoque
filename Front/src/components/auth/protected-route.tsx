import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "@/stores/auth-store"

export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status)

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex h-svh items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    )
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const status = useAuthStore((s) => s.status)

  if (status === "authenticated") {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
