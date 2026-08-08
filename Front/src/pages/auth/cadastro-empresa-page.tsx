import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Building2, Mail, User } from "lucide-react"
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
import { cadastroEmpresaSchema, type CadastroEmpresaFormValues } from "@/schemas/auth.schema"
import { createEmpresa } from "@/api/empresa"
import { getApiErrorMessage } from "@/api/client"
import { formatCnpj } from "@/lib/format"
import { AuthLayout } from "@/pages/auth/auth-layout"

export function CadastroEmpresaPage() {
  const navigate = useNavigate()

  const form = useForm<CadastroEmpresaFormValues>({
    resolver: zodResolver(cadastroEmpresaSchema),
    defaultValues: { nome: "", cnpj: "", adminNome: "", adminEmail: "", adminSenha: "" },
  })

  const mutation = useMutation({
    mutationFn: createEmpresa,
    onSuccess: () => {
      toast.success("Empresa cadastrada com sucesso! Faça login para continuar.")
      navigate("/login", { replace: true })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Não foi possível cadastrar a empresa."))
    },
  })

  function onSubmit(values: CadastroEmpresaFormValues) {
    mutation.mutate(values)
  }

  return (
    <AuthLayout title="Criar sua empresa" description="Crie sua empresa e o usuário administrador em um só passo.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da empresa</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Building2 className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Minha Loja Ltda" autoFocus className="pl-8" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="00.000.000/0000-00"
                      inputMode="numeric"
                      maxLength={18}
                      {...field}
                      onChange={(e) => field.onChange(formatCnpj(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">Usuário administrador</p>
              <p className="text-xs text-muted-foreground">
                Essa será sua conta de acesso, com permissão total sobre a empresa.
              </p>
            </div>

            <FormField
              control={form.control}
              name="adminNome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu nome</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Nome completo" className="pl-8" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adminEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="email" placeholder="voce@empresa.com" className="pl-8" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adminSenha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Cadastrando..." : "Cadastrar"}
          </Button>
        </form>
      </Form>
      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link to="/login" className="font-medium text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}
