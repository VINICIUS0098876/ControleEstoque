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
import { useCreateCliente, useUpdateCliente } from "@/hooks/use-clientes"
import type { Cliente } from "@/types"

const clienteSchema = z.object({
  nome: z
    .string()
    .min(2, "O nome deve ter no mínimo 2 caracteres.")
    .max(150, "O nome excedeu o limite de 150 caracteres."),
  telefone: z.string().max(20).optional().or(z.literal("")),
  // Campo vazio chega aqui como `undefined` (ver valorNumericoInput/aoMudarNumero
  // abaixo, mesmo padrão de produto-form-dialog.tsx) — sem isso, z.coerce.number()
  // converteria "" em 0 e "sem limite" seria salvo como limite zero em silêncio.
  limiteCredito: z.coerce.number().nonnegative("O limite não pode ser negativo.").optional(),
})
type ClienteFormValues = z.infer<typeof clienteSchema>

function valorNumericoInput(value: number | undefined) {
  return value ?? ""
}

function aoMudarNumero(onChange: (value: string | undefined) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(e.target.value === "" ? undefined : e.target.value)
}

interface ClienteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente?: Cliente | null
  // Pré-preenche o nome com o que já foi digitado — usado pelo atalho "Novo cliente" do
  // seletor de cliente no PDV, pra não obrigar a redigitar o que a pessoa já buscou.
  nomeInicial?: string
  // Chamado só na criação (não na edição), com o cliente recém-criado — o PDV usa isso
  // pra selecioná-lo automaticamente assim que o cadastro é concluído.
  onCreated?: (cliente: Cliente) => void
}

const defaultValues: ClienteFormValues = { nome: "", telefone: "", limiteCredito: undefined }

export function ClienteFormDialog({ open, onOpenChange, cliente, nomeInicial, onCreated }: ClienteFormDialogProps) {
  const isEditing = !!cliente
  const createCliente = useCreateCliente()
  const updateCliente = useUpdateCliente()

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) return

    if (cliente) {
      form.reset({
        nome: cliente.nome,
        telefone: cliente.telefone ?? "",
        limiteCredito: cliente.limiteCredito ? Number(cliente.limiteCredito) : undefined,
      })
    } else {
      form.reset({ ...defaultValues, nome: nomeInicial ?? "" })
    }
  }, [open, cliente, nomeInicial, form])

  function onSubmit(values: ClienteFormValues) {
    const payload = {
      nome: values.nome,
      telefone: values.telefone || undefined,
      limiteCredito: values.limiteCredito,
    }

    if (isEditing) {
      updateCliente.mutate({ id: cliente.id, payload }, { onSuccess: () => onOpenChange(false) })
    } else {
      createCliente.mutate(payload, {
        onSuccess: (clienteCriado) => {
          onOpenChange(false)
          onCreated?.(clienteCriado)
        },
      })
    }
  }

  const isPending = createCliente.isPending || updateCliente.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Altere os dados do cliente." : "Cadastre um cliente para vender fiado a ele."}
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
                    <Input placeholder="Ex: Maria da Silva" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="limiteCredito"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite de fiado (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Sem limite"
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
