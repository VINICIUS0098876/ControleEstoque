import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Package,
  Tags,
  Users,
  UserCircle,
  Settings,
  Plus,
  ShoppingCart,
  Receipt,
  Contact,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { ProdutoImagem } from "@/components/produto-imagem"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useProdutos } from "@/hooks/use-produtos"
import { useAuthStore } from "@/stores/auth-store"
import type { Papel } from "@/types"

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface AtalhoNavegacao {
  to: string
  label: string
  icon: typeof LayoutDashboard
  papeisPermitidos?: Papel[]
}

const ATALHOS_NAVEGACAO: AtalhoNavegacao[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pdv", label: "PDV", icon: ShoppingCart },
  { to: "/vendas", label: "Vendas", icon: Receipt },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/categorias", label: "Categorias", icon: Tags },
  { to: "/clientes", label: "Clientes", icon: Contact },
  { to: "/usuarios", label: "Usuários", icon: Users, papeisPermitidos: ["ADMIN"] },
  { to: "/configuracoes", label: "Configurações", icon: Settings, papeisPermitidos: ["ADMIN"] },
  { to: "/perfil", label: "Meu perfil", icon: UserCircle },
]

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const navigate = useNavigate()
  const usuario = useAuthStore((s) => s.usuario)
  const atalhosVisiveis = ATALHOS_NAVEGACAO.filter(
    (item) => !item.papeisPermitidos || (usuario && item.papeisPermitidos.includes(usuario.papel))
  )
  const [busca, setBusca] = useState("")
  const buscaDebounced = useDebouncedValue(busca, 300)

  const { data } = useProdutos(
    { busca: buscaDebounced || undefined, limit: 6 },
    { enabled: open && buscaDebounced.length > 0 }
  )

  // Começa vazio de novo cada vez que o palette é reaberto.
  useEffect(() => {
    if (!open) setBusca("")
  }, [open])

  function irPara(caminho: string) {
    onOpenChange(false)
    navigate(caminho)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Busca rápida"
      description="Navegue pelo sistema ou busque um produto pelo nome."
    >
      <CommandInput
        placeholder="Buscar produto, ir para uma página..."
        value={busca}
        onValueChange={setBusca}
      />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        {buscaDebounced && data && data.produtos.length > 0 && (
          <>
            <CommandGroup heading="Produtos">
              {data.produtos.map((produto) => (
                <CommandItem
                  key={produto.id}
                  value={`produto ${produto.nome} ${produto.sku ?? ""}`}
                  onSelect={() => irPara(`/produtos/${produto.id}`)}
                >
                  <ProdutoImagem src={produto.imagemUrl} alt="" className="size-6 rounded-sm" />
                  {produto.nome}
                  {produto.sku && (
                    <span className="ml-auto text-xs text-muted-foreground">{produto.sku}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Ações rápidas">
          <CommandItem value="nova venda pdv" onSelect={() => irPara("/pdv")}>
            <ShoppingCart />
            Nova venda
          </CommandItem>
          <CommandItem value="cadastrar novo produto" onSelect={() => irPara("/produtos?novo=1")}>
            <Plus />
            Novo produto
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navegar">
          {atalhosVisiveis.map((item) => (
            <CommandItem key={item.to} value={item.label} onSelect={() => irPara(item.to)}>
              <item.icon />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
