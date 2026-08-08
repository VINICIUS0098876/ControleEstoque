import { NavLink } from "react-router-dom"
import { LayoutDashboard, Package, Tags, Users, UserCircle, LogOut, Search, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/mode-toggle"
import { EmpresaLogo } from "@/components/empresa-logo"
import { getInitials } from "@/lib/theme"
import type { Empresa, Papel, Usuario } from "@/types"

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  papeisPermitidos?: Papel[]
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/categorias", label: "Categorias", icon: Tags },
  { to: "/usuarios", label: "Usuários", icon: Users, papeisPermitidos: ["ADMIN"] },
  { to: "/configuracoes", label: "Configurações", icon: Settings, papeisPermitidos: ["ADMIN"] },
]

export interface SidebarProps {
  empresa: Empresa | null
  usuario: Usuario | null
  onLogout: () => void
  isLoggingOut: boolean
  onOpenBusca: () => void
  onNavigate?: () => void
}

// Conteúdo de navegação da aplicação. Usado tanto na <aside> fixa do desktop quanto
// dentro do Sheet (gaveta) que substitui a sidebar em telas pequenas — ver app-layout.tsx.
export function Sidebar({ empresa, usuario, onLogout, isLoggingOut, onNavigate, onOpenBusca }: SidebarProps) {
  // "Usuários" e "Configurações" são telas restritas a ADMIN no backend
  // (requireRole('ADMIN') em routes.ts) — escondê-las da navegação evita levar um
  // FUNCIONARIO a uma tela que só vai redirecionar (ver RequireRole) ou dar 403 ao carregar dados.
  const itensVisiveis = navItems.filter(
    (item) => !item.papeisPermitidos || (usuario && item.papeisPermitidos.includes(usuario.papel))
  )

  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <EmpresaLogo empresa={empresa} className="size-7 text-xs" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {empresa?.nome ?? "Controle de Estoque"}
        </span>
        <ModeToggle />
      </div>

      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={onOpenBusca}
          className="flex w-full items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[0.7rem]">
            {isMac ? "⌘" : "Ctrl"}K
          </kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Navegação principal">
        {itensVisiveis.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive && "bg-brand/10 text-brand hover:bg-brand/10 hover:text-brand"
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Separator />

      <div className="p-3">
        <NavLink
          to="/perfil"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted",
              isActive && "bg-muted"
            )
          }
        >
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">
              {usuario ? getInitials(usuario.nome) : <UserCircle className="size-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{usuario?.nome}</p>
            <p className="truncate text-xs text-muted-foreground">{usuario?.email}</p>
          </div>
        </NavLink>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full justify-start gap-2 text-muted-foreground"
          onClick={onLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </>
  )
}
