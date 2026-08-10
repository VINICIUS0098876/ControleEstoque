import { useState } from "react"
import { UserPlus, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Skeleton } from "@/components/ui/skeleton"
import { useClientes } from "@/hooks/use-clientes"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { ClienteFormDialog } from "@/pages/clientes/cliente-form-dialog"
import type { Cliente } from "@/types"

interface ClienteFiadoPickerProps {
  clienteSelecionado: Cliente | null
  onSelecionar: (cliente: Cliente) => void
}

// Combobox (Popover + Command, mesma dupla que o shadcn usa pra esse padrão) pra buscar e
// escolher o cliente de uma venda fiado no PDV, com atalho pra cadastrar um cliente novo
// sem sair da venda — quem está fiando geralmente está combinando isso na hora, na frente
// do balcão, não cadastrado de antemão.
export function ClienteFiadoPicker({ clienteSelecionado, onSelecionar }: ClienteFiadoPickerProps) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState("")
  const buscaDebounced = useDebouncedValue(busca, 250)
  const [formOpen, setFormOpen] = useState(false)

  // Sem `busca`, lista os primeiros clientes cadastrados (ordem alfabética, ver
  // ListClienteService) em vez de exigir digitar algo primeiro — diferente da busca de
  // produto do PDV, aqui a lista costuma ser curta o bastante pra valer mostrar de cara.
  const { data, isLoading } = useClientes({ busca: buscaDebounced || undefined, limit: 8 })

  function selecionarCliente(cliente: Cliente) {
    onSelecionar(cliente)
    setOpen(false)
    setBusca("")
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-start gap-2 font-normal">
            <UserRound className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{clienteSelecionado ? clienteSelecionado.nome : "Selecionar cliente"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
          <Command shouldFilter={false}>
            <CommandInput autoFocus placeholder="Buscar cliente..." value={busca} onValueChange={setBusca} />
            <CommandList className="max-h-64">
              {isLoading && (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              )}

              {!isLoading && data?.clientes.length === 0 && (
                <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                  {busca ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
                </CommandEmpty>
              )}

              {!isLoading && data && data.clientes.length > 0 && (
                <CommandGroup heading="Clientes">
                  {data.clientes.map((cliente) => (
                    <CommandItem key={cliente.id} value={cliente.id} onSelect={() => selecionarCliente(cliente)}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{cliente.nome}</p>
                        {cliente.telefone && (
                          <p className="truncate text-xs text-muted-foreground">{cliente.telefone}</p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="cadastrar-cliente-novo"
                  onSelect={() => {
                    setOpen(false)
                    setFormOpen(true)
                  }}
                >
                  <UserPlus className="size-4" />
                  {busca ? `Cadastrar "${busca}"` : "Novo cliente"}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <ClienteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        nomeInicial={busca}
        onCreated={selecionarCliente}
      />
    </>
  )
}
