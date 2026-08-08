import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileHeader } from "@/components/layout/mobile-header"
import { CommandMenu } from "@/components/command-menu"
import { useAuthStore } from "@/stores/auth-store"
import { useEmpresaStore } from "@/stores/empresa-store"
import { useLogout } from "@/hooks/use-auth"
import { useEmpresaQuery } from "@/hooks/use-empresa"

// Shell da aplicação autenticada: navegação (Sidebar no desktop, MobileHeader + gaveta
// no mobile) ao redor do conteúdo da rota atual (<Outlet />). Cada peça de navegação é
// seu próprio componente — este arquivo só compõe e distribui o estado compartilhado
// entre elas (empresa/usuário logados, paleta de comandos, menu mobile).
export function AppLayout() {
  useEmpresaQuery()

  const usuario = useAuthStore((s) => s.usuario)
  const empresa = useEmpresaStore((s) => s.empresa)
  const logout = useLogout()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key.toLowerCase() === "k" && (evento.metaKey || evento.ctrlKey)) {
        evento.preventDefault()
        setCommandOpen((aberto) => !aberto)
      }
    }

    window.addEventListener("keydown", aoTeclar)
    return () => window.removeEventListener("keydown", aoTeclar)
  }, [])

  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <MobileHeader
        empresa={empresa}
        usuario={usuario}
        onLogout={() => logout.mutate()}
        isLoggingOut={logout.isPending}
        onOpenBusca={() => setCommandOpen(true)}
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
      />

      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card lg:flex">
        <Sidebar
          empresa={empresa}
          usuario={usuario}
          onLogout={() => logout.mutate()}
          isLoggingOut={logout.isPending}
          onOpenBusca={() => setCommandOpen(true)}
        />
      </aside>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
