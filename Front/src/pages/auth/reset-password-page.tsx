import { Link, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/components/ui/password-input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/schemas/auth.schema"
import { useResetPassword } from "@/hooks/use-auth"
import { AuthLayout } from "@/pages/auth/auth-layout"

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const resetPassword = useResetPassword()

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { senha: "", confirmarSenha: "" },
  })

  // Sem token na URL não há o que redefinir — nem vale mostrar o formulário (o back
  // rejeitaria de qualquer forma, mas a mensagem de "link inválido" direto é mais clara
  // do que deixar a pessoa preencher a senha pra só então descobrir o problema).
  if (!token) {
    return (
      <AuthLayout
        title="Link inválido"
        description="Este link de redefinição de senha é inválido ou já foi usado."
      >
        <Link to="/esqueci-a-senha" className="text-sm font-medium text-brand hover:underline">
          Solicitar um novo link
        </Link>
      </AuthLayout>
    )
  }

  // TypeScript não propaga o narrowing do "if (!token) return" acima para dentro desta
  // closure (o corpo de uma função aninhada é um novo escopo de controle de fluxo) — daí
  // reatribuir para uma const própria aqui, já com o tipo `string` (sem `| null`) resolvido.
  const tokenValidado = token

  function onSubmit(values: ResetPasswordFormValues) {
    resetPassword.mutate({ token: tokenValidado, senha: values.senha })
  }

  return (
    <AuthLayout title="Escolha uma nova senha" description="Sua nova senha precisa ter no mínimo 6 caracteres.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="senha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova senha</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
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
          <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
            {resetPassword.isPending ? "Salvando..." : "Redefinir senha"}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  )
}
