import { create } from "zustand"
import type { Empresa } from "@/types"

interface EmpresaState {
  empresa: Empresa | null
  setEmpresa: (empresa: Empresa | null) => void
}

export const useEmpresaStore = create<EmpresaState>((set) => ({
  empresa: null,
  setEmpresa: (empresa) => set({ empresa }),
}))
