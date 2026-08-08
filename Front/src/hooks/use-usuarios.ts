import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  adminResetPassword,
  adminUpdateUsuario,
  createUsuario,
  deactivateUsuario,
  listUsuarios,
  reactivateUsuario,
  type AdminUpdateUsuarioPayload,
  type CreateUsuarioPayload,
} from "@/api/usuario"
import { getApiErrorMessage } from "@/api/client"

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: listUsuarios,
  })
}

export function useCreateUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateUsuarioPayload) => createUsuario(payload),
    onSuccess: () => {
      toast.success("Funcionário cadastrado com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["usuarios"] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível cadastrar o funcionário.")),
  })
}

export function useReactivateUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reactivateUsuario(id),
    onSuccess: () => {
      toast.success("Usuário reativado com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["usuarios"] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível reativar o usuário.")),
  })
}

export function useDeactivateUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateUsuario(id),
    onSuccess: () => {
      toast.success("Usuário desativado com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["usuarios"] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível desativar o usuário.")),
  })
}

export function useAdminUpdateUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminUpdateUsuarioPayload) => adminUpdateUsuario(payload),
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["usuarios"] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível atualizar o usuário.")),
  })
}

// Sem toast de sucesso aqui de propósito: a senha provisória retornada precisa ficar
// visível na tela (ver usuarios-page.tsx) até o ADMIN copiá-la, não sumir em alguns
// segundos como um toast.
export function useAdminResetPassword() {
  return useMutation({
    mutationFn: (id: string) => adminResetPassword(id),
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível redefinir a senha do usuário.")),
  })
}
