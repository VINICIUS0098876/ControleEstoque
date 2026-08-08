import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getEmpresa, updateEmpresa, type UpdateEmpresaPayload } from "@/api/empresa"
import { getApiErrorMessage } from "@/api/client"
import { useEmpresaStore } from "@/stores/empresa-store"
import { useAuthStore } from "@/stores/auth-store"
import { applyBrandColor } from "@/lib/theme"

export function useEmpresaQuery() {
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated")
  const setEmpresa = useEmpresaStore((s) => s.setEmpresa)

  const query = useQuery({
    queryKey: ["empresa"],
    queryFn: getEmpresa,
    enabled: isAuthenticated,
  })

  useEffect(() => {
    if (query.data) {
      setEmpresa(query.data)
      applyBrandColor(query.data.temaCor)
    }
  }, [query.data, setEmpresa])

  return query
}

export function useUpdateEmpresa() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateEmpresaPayload) => updateEmpresa(payload),
    onSuccess: () => {
      toast.success("Dados da empresa atualizados com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["empresa"] })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Não foi possível atualizar a empresa."))
    },
  })
}
