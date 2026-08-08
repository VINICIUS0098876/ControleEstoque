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
import type { Categoria } from "@/types"
import { useCreateCategoria, useUpdateCategoria } from "@/hooks/use-categorias"

const categoriaSchema = z.object({
  nome: z
    .string()
    .min(2, "O nome deve ter no mínimo 2 caracteres.")
    .max(150, "O nome excedeu o limite de 150 caracteres."),
})
type CategoriaFormValues = z.infer<typeof categoriaSchema>

interface CategoriaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoria?: Categoria | null
}

export function CategoriaFormDialog({ open, onOpenChange, categoria }: CategoriaFormDialogProps) {
  const isEditing = !!categoria
  const createCategoria = useCreateCategoria()
  const updateCategoria = useUpdateCategoria()

  const form = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { nome: "" },
  })

  useEffect(() => {
    if (open) {
      form.reset({ nome: categoria?.nome ?? "" })
    }
  }, [open, categoria, form])

  function onSubmit(values: CategoriaFormValues) {
    if (isEditing) {
      updateCategoria.mutate(
        { id: categoria.id, payload: values },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createCategoria.mutate(values, { onSuccess: () => onOpenChange(false) })
    }
  }

  const isPending = createCategoria.isPending || updateCategoria.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Altere o nome da categoria." : "Crie uma categoria para organizar seus produtos."}
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
                    <Input placeholder="Ex: Bebidas" autoFocus {...field} />
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
