import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Mail, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/schemas/auth.schema"
import { useForgotPassword } from "@/hooks/use-auth"
import { AuthLayout } from "@/pages/auth/auth-layout"

export function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword()
  // A API responde com sucesso independente do e-mail existir (ver api/auth.ts) — guardar
  // o e-mail digitado só serve pra personalizar a tela de confirmação, não é usado pra
  // decidir se o e-mail é válido.
  const [emailEnviado, setEmailEnviado] = useState<string | null>(null)

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  function onSubmit(values: ForgotPasswordFormValues) {
    forgotPassword.mutate(values, {
      onSuccess: () => setEmailEnviado(values.email),
    })
  }

  if (emailEnviado) {
    return (
      <AuthLayout
        title="Verifique seu e-mail"
        description={`Se ${emailEnviado} estiver cadastrado, enviamos um link para redefinir a senha. Ele expira em 30 minutos.`}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <MailCheck className="size-6" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">
            Não recebeu o e-mail? Confira a caixa de spam ou{" "}
            <button
              type="button"
              onClick={() => setEmailEnviado(null)}
              className="font-medium text-brand hover:underline"
            >
              tente novamente
            </button>
            .
          </p>
          <Link to="/login" className="text-sm font-medium text-brand hover:underline">
            Voltar para o login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Esqueceu sua senha?"
      description="Informe seu e-mail e enviaremos um link para você escolher uma nova senha."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="voce@empresa.com"
                      autoComplete="email"
                      autoFocus
                      className="pl-8"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
            {forgotPassword.isPending ? "Enviando..." : "Enviar link de redefinição"}
          </Button>
        </form>
      </Form>
      <p className="text-center text-sm text-muted-foreground">
        Lembrou a senha?{" "}
        <Link to="/login" className="font-medium text-brand hover:underline">
          Voltar para o login
        </Link>
      </p>
    </AuthLayout>
  )
}
