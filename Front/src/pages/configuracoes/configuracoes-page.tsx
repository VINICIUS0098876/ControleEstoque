import { useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ColorPickerInput } from "@/components/ui/color-picker-input"
import { ProdutoImagem } from "@/components/produto-imagem"
import { Skeleton } from "@/components/ui/skeleton"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { useEmpresaStore } from "@/stores/empresa-store"
import { useUpdateEmpresa } from "@/hooks/use-empresa"
import { applyBrandColor } from "@/lib/theme"
import { formatCnpj } from "@/lib/format"
import { updateEmpresaSchema, HEX_COLOR_PATTERN, type UpdateEmpresaFormValues } from "@/schemas/empresa.schema"

export function ConfiguracoesPage() {
  useDocumentTitle("Configurações da empresa")

  const empresa = useEmpresaStore((s) => s.empresa)
  const updateEmpresa = useUpdateEmpresa()
  // Controla se a prévia ao vivo da cor deve ser revertida ao sair da página (ver efeito
  // de cleanup abaixo). Não precisa ser state: só é lido no cleanup, nunca no render.
  const salvouRef = useRef(false)

  // `values` (em vez de `defaultValues`) sempre com um objeto definido — mesmo antes da
  // empresa carregar — evita o input passar de "não controlado" (value: undefined) para
  // "controlado" assim que os dados chegam (warning do React); ver o mesmo padrão em
  // perfil-page.tsx.
  const form = useForm<UpdateEmpresaFormValues>({
    resolver: zodResolver(updateEmpresaSchema),
    values: {
      nome: empresa?.nome ?? "",
      cnpj: empresa?.cnpj ?? "",
      logoUrl: empresa?.logoUrl ?? "",
      temaCor: empresa?.temaCor ?? "",
    },
  })

  const temaCorAtual = form.watch("temaCor")
  const logoUrlAtual = form.watch("logoUrl")

  // Prévia ao vivo: reflete a cor digitada na marca do app inteiro (sidebar, botões etc.)
  // antes mesmo de salvar — é o principal recurso pedido pra demonstrações de venda.
  // Ignora valores intermediários inválidos (ex: "#0f" no meio da digitação) pra não deixar
  // a marca "quebrada" a cada tecla; campo vazio limpa a prévia (undefined), não volta pra
  // cor salva — o objetivo é mostrar exatamente o que o campo atual representa agora.
  useEffect(() => {
    if (!temaCorAtual || HEX_COLOR_PATTERN.test(temaCorAtual)) {
      applyBrandColor(temaCorAtual || undefined)
    }
  }, [temaCorAtual])

  // Se o usuário sair da página sem salvar, reverte a marca pra cor realmente persistida.
  // Se salvou, o refetch de ['empresa'] disparado pelo onSuccess de useUpdateEmpresa já
  // reaplica a cor correta (useEmpresaQuery roda em AppLayout, continua montado ao navegar).
  useEffect(() => {
    return () => {
      if (!salvouRef.current) {
        applyBrandColor(empresa?.temaCor)
      }
    }
  }, [empresa?.temaCor])

  function onSubmit(values: UpdateEmpresaFormValues) {
    updateEmpresa.mutate(
      {
        nome: values.nome,
        cnpj: values.cnpj,
        logoUrl: values.logoUrl || undefined,
        temaCor: values.temaCor || undefined,
      },
      { onSuccess: () => { salvouRef.current = true } }
    )
  }

  if (!empresa) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações da empresa</h1>
        <p className="text-sm text-muted-foreground">
          Dados cadastrais e identidade visual usados em todo o sistema.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados da empresa</CardTitle>
              <CardDescription>Nome e CNPJ usados no cadastro.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da empresa</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Marca (white-label)</CardTitle>
              <CardDescription>
                Logo e cor aplicadas em toda a interface — visíveis para todos os usuários da empresa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da logo</FormLabel>
                    <div className="flex items-center gap-4">
                      <ProdutoImagem
                        src={logoUrlAtual}
                        alt="Pré-visualização da logo"
                        className="size-16 shrink-0 rounded-lg"
                      />
                      <div className="flex-1">
                        <FormControl>
                          <Input placeholder="https://minhaempresa.com/logo.png" {...field} />
                        </FormControl>
                      </div>
                    </div>
                    <FormDescription>Cole a URL pública de uma imagem quadrada.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="temaCor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor de marca</FormLabel>
                    <FormControl>
                      <ColorPickerInput {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>
                      Aplicada em tempo real na navegação e nos botões — ideal para mostrar a marca
                      do cliente durante uma demonstração.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateEmpresa.isPending}>
              {updateEmpresa.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
