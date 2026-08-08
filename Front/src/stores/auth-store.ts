import { create } from "zustand"
import type { Usuario } from "@/types"

interface AuthState {
  usuario: Usuario | null
  status: "idle" | "loading" | "authenticated" | "unauthenticated"
  setUsuario: (usuario: Usuario | null) => void
  setStatus: (status: AuthState["status"]) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  status: "idle",
  setUsuario: (usuario) =>
    set({ usuario, status: usuario ? "authenticated" : "unauthenticated" }),
  setStatus: (status) => set({ status }),
  reset: () => set({ usuario: null, status: "unauthenticated" }),
}))
