import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { useCreatePagamentoFiado } from "@/hooks/use-clientes"
import { formatCurrency } from "@/lib/format"
import type { Cliente } from "@/types"

const pagamentoSchema = z.object({
  // Campo vazio vira `undefined` (ver valorNumericoInput/aoMudarNumero), não 0 — evita
  // registrar um pagamento de R$0,00 em silêncio se o campo for deixado em branco.
  valor: z.coerce
    .number({ message: "Informe um valor válido." })
    .positive("O valor deve ser maior que zero.")
    .optional(),
})
type PagamentoFormValues = z.infer<typeof pagamentoSchema>

function valorNumericoInput(value: number | undefined) {
  return value ?? ""
}

function aoMudarNumero(onChange: (value: string | undefined) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(e.target.value === "" ? undefined : e.target.value)
}

interface PagamentoFiadoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente
}

export function PagamentoFiadoDialog({ open, onOpenChange, cliente }: PagamentoFiadoDialogProps) {
  const createPagamento = useCreatePagamentoFiado(cliente.id)

  const form = useForm<PagamentoFormValues>({
    resolver: zodResolver(pagamentoSchema),
    defaultValues: { valor: undefined },
  })

  useEffect(() => {
    if (open) form.reset({ valor: undefined })
  }, [open, form])

  function onSubmit(values: PagamentoFormValues) {
    // `valor` só chega aqui indefinido se a validação já tivesse barrado o submit (campo
    // obrigatório) — o `!` só resolve o tipo opcional herdado do tratamento de campo vazio.
    createPagamento.mutate(values.valor!, { onSuccess: () => onOpenChange(false) })
  }

  const saldo = cliente.saldoDevedor ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>
            {cliente.nome} — saldo devedor atual: {formatCurrency(saldo)}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Valor recebido</FormLabel>
                    {saldo > 0 && (
                      <button
                        type="button"
                        onClick={() => form.setValue("valor", saldo, { shouldValidate: true })}
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        Pagar tudo ({formatCurrency(saldo)})
                      </button>
                    )}
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      autoFocus
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPagamento.isPending}>
                {createPagamento.isPending ? "Registrando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
