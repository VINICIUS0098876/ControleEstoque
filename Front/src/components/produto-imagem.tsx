import { useEffect, useState } from "react"
import { Package } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProdutoImagemProps {
  src?: string | null
  alt: string
  className?: string
}

// Usado na tabela de produtos (miniatura), no formulário (preview ao colar a URL) e na
// página de detalhe. Cai para um ícone quando não há imagem ou a URL falha ao carregar.
export function ProdutoImagem({ src, alt, className }: ProdutoImagemProps) {
  const [carregouComErro, setCarregouComErro] = useState(false)

  useEffect(() => {
    setCarregouComErro(false)
  }, [src])

  const mostrarFallback = !src || carregouComErro

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted",
        className
      )}
    >
      {mostrarFallback ? (
        <Package className="size-[40%] text-muted-foreground" />
      ) : (
        <img
          src={src}
          alt={alt}
          className="size-full object-cover"
          onError={() => setCarregouComErro(true)}
        />
      )}
    </div>
  )
}
