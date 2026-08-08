import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  createMovimentacao,
  listMovimentacoes,
  type CreateMovimentacaoPayload,
} from "@/api/movimentacao"
import { getApiErrorMessage } from "@/api/client"

export function useMovimentacoes(produtoId: string | undefined) {
  return useQuery({
    queryKey: ["movimentacoes", produtoId],
    queryFn: () => listMovimentacoes(produtoId as string),
    enabled: !!produtoId,
  })
}

export function useCreateMovimentacao(produtoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateMovimentacaoPayload) => createMovimentacao(produtoId, payload),
    onSuccess: () => {
      toast.success("Movimentação registrada com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["movimentacoes", produtoId] })
      queryClient.invalidateQueries({ queryKey: ["produto", produtoId] })
      queryClient.invalidateQueries({ queryKey: ["produtos"] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível registrar a movimentação.")),
  })
}
