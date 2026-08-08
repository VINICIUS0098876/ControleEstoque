import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { getInitials } from "@/lib/theme"
import type { Empresa } from "@/types"

interface EmpresaLogoProps {
  empresa: Empresa | null
  className?: string
}

// Mostra a logo da empresa, com fallback para as iniciais do nome (badge na cor de marca)
// quando não há logoUrl ou a imagem falha ao carregar. Usado na sidebar, no header mobile
// e na tela de login/cadastro — os três precisam do mesmo comportamento (antes disso, cada
// um tinha sua própria cópia do <img> sem tratar erro de carregamento).
export function EmpresaLogo({ empresa, className }: EmpresaLogoProps) {
  const [carregouComErro, setCarregouComErro] = useState(false)

  useEffect(() => {
    setCarregouComErro(false)
  }, [empresa?.logoUrl])

  if (empresa?.logoUrl && !carregouComErro) {
    return (
      <img
        src={empresa.logoUrl}
        alt={empresa.nome}
        className={cn("shrink-0 rounded object-cover", className)}
        onError={() => setCarregouComErro(true)}
      />
    )
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded bg-brand font-semibold text-brand-foreground",
        className
      )}
    >
      {empresa ? getInitials(empresa.nome) : "CE"}
    </div>
  )
}
