import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuthStore } from "@/stores/auth-store"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { updateUsuario, patchPassword } from "@/api/usuario"
import { getApiErrorMessage } from "@/api/client"

const perfilSchema = z.object({
  nome: z.string().min(3, "O nome deve ter no mínimo 3 caracteres."),
  email: z.string().email("Insira um e-mail válido."),
})
type PerfilFormValues = z.infer<typeof perfilSchema>

const senhaSchema = z
  .object({
    senhaAntiga: z.string().min(1, "Informe a senha atual."),
    senha: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres."),
    confirmarSenha: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não coincidem.",
    path: ["confirmarSenha"],
  })
type SenhaFormValues = z.infer<typeof senhaSchema>

export function PerfilPage() {
  useDocumentTitle("Meu perfil")

  const usuario = useAuthStore((s) => s.usuario)
  const setUsuario = useAuthStore((s) => s.setUsuario)
  const queryClient = useQueryClient()

  const perfilForm = useForm<PerfilFormValues>({
    resolver: zodResolver(perfilSchema),
    values: { nome: usuario?.nome ?? "", email: usuario?.email ?? "" },
  })

  const senhaForm = useForm<SenhaFormValues>({
    resolver: zodResolver(senhaSchema),
    defaultValues: { senhaAntiga: "", senha: "", confirmarSenha: "" },
  })

  const updatePerfil = useMutation({
    mutationFn: updateUsuario,
    onSuccess: (usuarioAtualizado) => {
      setUsuario({ ...usuario, ...usuarioAtualizado })
      toast.success("Perfil atualizado com sucesso.")
      queryClient.invalidateQueries({ queryKey: ["usuarios"] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível atualizar o perfil.")),
  })

  const updateSenha = useMutation({
    mutationFn: (values: SenhaFormValues) =>
      patchPassword({ senha: values.senha, senhaAntiga: values.senhaAntiga }),
    onSuccess: () => {
      toast.success("Senha alterada com sucesso.")
      senhaForm.reset()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Não foi possível alterar a senha.")),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meu perfil</h1>
        <p className="text-sm text-muted-foreground">Gerencie seus dados de acesso.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados pessoais</CardTitle>
          <CardDescription>Nome e email usados para login.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...perfilForm}>
            <form
              onSubmit={perfilForm.handleSubmit((values) => updatePerfil.mutate(values))}
              className="space-y-4"
            >
              <FormField
                control={perfilForm.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={perfilForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={updatePerfil.isPending}>
                {updatePerfil.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alterar senha</CardTitle>
          <CardDescription>Você precisa informar a senha atual.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...senhaForm}>
            <form
              onSubmit={senhaForm.handleSubmit((values) => updateSenha.mutate(values))}
              className="space-y-4"
            >
              <FormField
                control={senhaForm.control}
                name="senhaAntiga"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha atual</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={senhaForm.control}
                name="senha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={senhaForm.control}
                name="confirmarSenha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar nova senha</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" variant="outline" disabled={updateSenha.isPending}>
                {updateSenha.isPending ? "Alterando..." : "Alterar senha"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
