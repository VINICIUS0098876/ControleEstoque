import { RequireRole } from "@/components/auth/require-role"

export function AdminRoute() {
  return <RequireRole papeisPermitidos={["ADMIN"]} />
}
