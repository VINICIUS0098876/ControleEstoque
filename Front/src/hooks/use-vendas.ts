import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  createVenda,
  listVendas,
  getVenda,
  type CreateVendaPayload,
  type ListVendasParams,
} from "@/api/venda"
import { getApiErrorMessage } from "@/api/client"

export function useVendas(params: ListVendasParams = {}) {
  return useQuery({
    queryKey: ["vendas", params],
    queryFn: () => listVendas(params),
    placeholderData: keepPreviousData,
  })
}

export function useVenda(id: string | undefined) {
  return useQuery({
    queryKey: ["venda", id],
    queryFn: () => getVenda(id as string),
    enabled: !!id,
  })
}

export function useCreateVenda() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateVendaPayload) => createVenda(payload),
    onSuccess: () => {
      toast.success("Venda registrada com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["vendas"] })
      queryClient.invalidateQueries({ queryKey: ["produtos"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível registrar a venda.")),
  })
}
