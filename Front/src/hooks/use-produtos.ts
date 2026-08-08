import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  listProdutos,
  getProduto,
  createProduto,
  updateProduto,
  deleteProduto,
  type ListProdutosParams,
  type ProdutoPayload,
} from "@/api/produto"
import { getApiErrorMessage } from "@/api/client"

export function useProdutos(params: ListProdutosParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["produtos", params],
    queryFn: () => listProdutos(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled,
  })
}

export function useProduto(id: string | undefined) {
  return useQuery({
    queryKey: ["produto", id],
    queryFn: () => getProduto(id as string),
    enabled: !!id,
  })
}

export function useCreateProduto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProdutoPayload) => createProduto(payload),
    onSuccess: () => {
      toast.success("Produto criado com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["produtos"] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível criar o produto.")),
  })
}

export function useUpdateProduto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Omit<ProdutoPayload, "quantidadeAtual"> }) =>
      updateProduto(id, payload),
    onSuccess: (produto) => {
      toast.success("Produto atualizado com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["produtos"] })
      queryClient.invalidateQueries({ queryKey: ["produto", produto.id] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível atualizar o produto.")),
  })
}

export function useDeleteProduto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProduto(id),
    onSuccess: () => {
      toast.success("Produto excluído com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["produtos"] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível excluir o produto.")),
  })
}
