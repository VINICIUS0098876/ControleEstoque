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
import { movimentacaoSchema, type MovimentacaoFormValues } from "@/schemas/produto.schema"
import { useCreateMovimentacao } from "@/hooks/use-movimentacoes"
import type { Produto } from "@/types"

interface MovimentacaoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  produto: Produto
}

const tipoLabel: Record<MovimentacaoFormValues["tipo"], string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  ESTORNO: "Estorno",
}

export function MovimentacaoDialog({ open, onOpenChange, produto }: MovimentacaoDialogProps) {
  const createMovimentacao = useCreateMovimentacao(produto.id)

  const form = useForm<MovimentacaoFormValues>({
    resolver: zodResolver(movimentacaoSchema),
    defaultValues: { tipo: "ENTRADA", quantidade: 1, motivo: "" },
  })

  useEffect(() => {
    if (open) {
      form.reset({ tipo: "ENTRADA", quantidade: 1, motivo: "" })
    }
  }, [open, form])

  function onSubmit(values: MovimentacaoFormValues) {
    createMovimentacao.mutate(
      { ...values, motivo: values.motivo || undefined },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Movimentar estoque</DialogTitle>
          <DialogDescription>
            {produto.nome} — estoque atual: {produto.quantidadeAtual} {produto.unidadeMedida}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(tipoLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Venda PDV, ajuste manual..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMovimentacao.isPending}>
                {createMovimentacao.isPending ? "Registrando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
