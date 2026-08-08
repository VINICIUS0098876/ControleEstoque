import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  listCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  type CategoriaPayload,
  type ListCategoriasParams,
} from "@/api/categoria"
import { getApiErrorMessage } from "@/api/client"

export function useCategorias(params: ListCategoriasParams = {}) {
  return useQuery({
    queryKey: ["categorias", params],
    queryFn: () => listCategorias(params),
  })
}

export function useCreateCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CategoriaPayload) => createCategoria(payload),
    onSuccess: () => {
      toast.success("Categoria criada com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["categorias"] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível criar a categoria.")),
  })
}

export function useUpdateCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoriaPayload }) =>
      updateCategoria(id, payload),
    onSuccess: () => {
      toast.success("Categoria atualizada com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["categorias"] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível atualizar a categoria.")),
  })
}

export function useDeleteCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategoria(id),
    onSuccess: () => {
      toast.success("Categoria excluída com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["categorias"] })
      queryClient.invalidateQueries({ queryKey: ["produtos"] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível excluir a categoria.")),
  })
}
