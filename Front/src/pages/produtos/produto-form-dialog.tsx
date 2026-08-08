import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { produtoSchema, type ProdutoFormValues } from "@/schemas/produto.schema"
import { useCreateProduto, useUpdateProduto } from "@/hooks/use-produtos"
import { useCategorias } from "@/hooks/use-categorias"
import { ProdutoImagem } from "@/components/produto-imagem"
import type { Produto } from "@/types"

// Radix Select.Item não aceita value="", então "sem categoria" precisa de um sentinel
// próprio para poder aparecer na lista e ser selecionável (ver mesmo padrão em
// produtos-page.tsx para o filtro "todas as categorias").
const SEM_CATEGORIA = "__sem_categoria__"

// <input type="number"> reporta o campo vazio como "". Se isso chegasse direto ao Zod,
// z.coerce.number() converteria "" em 0 (Number("") === 0) e um preço apagado seria
// salvo como zero em silêncio, sem erro de validação. Convertendo para `undefined` aqui,
// o schema (produto.schema.ts) rejeita corretamente como campo obrigatório ausente.
function valorNumericoInput(value: number | undefined) {
  return value ?? ""
}

function aoMudarNumero(onChange: (value: string | undefined) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(e.target.value === "" ? undefined : e.target.value)
}

interface ProdutoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  produto?: Produto | null
}

const defaultValues: ProdutoFormValues = {
  nome: "",
  codigoBarras: "",
  sku: "",
  descricao: "",
  unidadeMedida: "UN",
  precoCusto: 0,
  precoVenda: 0,
  quantidadeAtual: 0,
  estoqueMinimo: 5,
  imagemUrl: "",
  categoriaId: "",
}

export function ProdutoFormDialog({ open, onOpenChange, produto }: ProdutoFormDialogProps) {
  const isEditing = !!produto
  const { data: categorias } = useCategorias()
  const createProduto = useCreateProduto()
  const updateProduto = useUpdateProduto()

  const form = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) return

    if (produto) {
      form.reset({
        nome: produto.nome,
        codigoBarras: produto.codigoBarras ?? "",
        sku: produto.sku ?? "",
        descricao: produto.descricao ?? "",
        unidadeMedida: produto.unidadeMedida ?? "UN",
        precoCusto: Number(produto.precoCusto),
        precoVenda: Number(produto.precoVenda),
        quantidadeAtual: produto.quantidadeAtual,
        estoqueMinimo: produto.estoqueMinimo,
        imagemUrl: produto.imagemUrl ?? "",
        categoriaId: produto.categoriaId ?? "",
      })
    } else {
      form.reset(defaultValues)
    }
  }, [open, produto, form])

  function onSubmit(values: ProdutoFormValues) {
    const payload = {
      ...values,
      codigoBarras: values.codigoBarras || undefined,
      sku: values.sku || undefined,
      descricao: values.descricao || undefined,
      unidadeMedida: values.unidadeMedida || undefined,
      imagemUrl: values.imagemUrl || undefined,
      categoriaId: values.categoriaId || undefined,
    }

    if (isEditing) {
      const { quantidadeAtual: _quantidadeAtual, ...updatePayload } = payload
      updateProduto.mutate(
        { id: produto.id, payload: updatePayload },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createProduto.mutate(payload, { onSuccess: () => onOpenChange(false) })
    }
  }

  const isPending = createProduto.isPending || updateProduto.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Estoque não é editado aqui — use uma movimentação para ajustar a quantidade."
              : "Preencha os dados do produto."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Camiseta preta M" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="CAM-PRETA-M" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="codigoBarras"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de barras</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categoriaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select
                    value={field.value || SEM_CATEGORIA}
                    onValueChange={(value) => field.onChange(value === SEM_CATEGORIA ? "" : value)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sem categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SEM_CATEGORIA}>Sem categoria</SelectItem>
                      {categorias?.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="precoCusto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de custo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={valorNumericoInput(field.value)}
                        onChange={aoMudarNumero(field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="precoVenda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de venda</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={valorNumericoInput(field.value)}
                        onChange={aoMudarNumero(field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {!isEditing && (
                <FormField
                  control={form.control}
                  name="quantidadeAtual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estoque inicial</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={valorNumericoInput(field.value)}
                          onChange={aoMudarNumero(field.onChange)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="estoqueMinimo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque mínimo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={valorNumericoInput(field.value)}
                        onChange={aoMudarNumero(field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unidadeMedida"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <FormControl>
                      <Input placeholder="UN" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="imagemUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da imagem</FormLabel>
                  <div className="flex items-start gap-3">
                    <ProdutoImagem src={field.value} alt="" className="size-16" />
                    <div className="flex-1 space-y-1.5">
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
