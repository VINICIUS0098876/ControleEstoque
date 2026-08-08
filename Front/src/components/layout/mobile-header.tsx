import { Menu, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ModeToggle } from "@/components/mode-toggle"
import { EmpresaLogo } from "@/components/empresa-logo"
import { Sidebar, type SidebarProps } from "@/components/layout/sidebar"

interface MobileHeaderProps extends SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Barra superior + gaveta (Sheet) que substituem a <aside> fixa em telas menores que `lg`.
// Reaproveita o mesmo <Sidebar> da navegação desktop dentro da gaveta, para as duas
// superfícies nunca divergirem em itens de menu.
export function MobileHeader({ empresa, usuario, onLogout, isLoggingOut, onOpenBusca, open, onOpenChange }: MobileHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4 lg:hidden">
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Abrir menu de navegação">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 gap-0 bg-card p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <Sidebar
            empresa={empresa}
            usuario={usuario}
            onLogout={onLogout}
            isLoggingOut={isLoggingOut}
            onNavigate={() => onOpenChange(false)}
            onOpenBusca={() => {
              onOpenChange(false)
              onOpenBusca()
            }}
          />
        </SheetContent>
      </Sheet>

      <EmpresaLogo empresa={empresa} className="size-6 text-[0.65rem]" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
        {empresa?.nome ?? "Controle de Estoque"}
      </span>
      <Button variant="ghost" size="icon-sm" aria-label="Buscar" onClick={onOpenBusca}>
        <Search className="size-4" />
      </Button>
      <ModeToggle />
    </header>
  )
}
