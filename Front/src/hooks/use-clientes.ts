import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  listClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente,
  createPagamentoFiado,
  listPagamentosFiado,
  type ListClientesParams,
  type ClientePayload,
} from "@/api/cliente"
import { getApiErrorMessage } from "@/api/client"

export function useClientes(params: ListClientesParams = {}) {
  return useQuery({
    queryKey: ["clientes", params],
    queryFn: () => listClientes(params),
    placeholderData: keepPreviousData,
  })
}

export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: ["cliente", id],
    queryFn: () => getCliente(id as string),
    enabled: !!id,
  })
}

export function useCreateCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ClientePayload) => createCliente(payload),
    onSuccess: () => {
      toast.success("Cliente cadastrado com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["clientes"] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível cadastrar o cliente.")),
  })
}

export function useUpdateCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ClientePayload }) => updateCliente(id, payload),
    onSuccess: (cliente) => {
      toast.success("Cliente atualizado com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["clientes"] })
      queryClient.invalidateQueries({ queryKey: ["cliente", cliente.id] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível atualizar o cliente.")),
  })
}

export function useDeleteCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCliente(id),
    onSuccess: () => {
      toast.success("Cliente excluído com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["clientes"] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível excluir o cliente.")),
  })
}

export function usePagamentosFiado(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["pagamentos-fiado", clienteId],
    queryFn: () => listPagamentosFiado(clienteId as string),
    enabled: !!clienteId,
  })
}

export function useCreatePagamentoFiado(clienteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (valor: number) => createPagamentoFiado(clienteId, valor),
    onSuccess: () => {
      toast.success("Pagamento registrado com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["pagamentos-fiado", clienteId] })
      queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] })
      queryClient.invalidateQueries({ queryKey: ["clientes"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível registrar o pagamento.")),
  })
}
