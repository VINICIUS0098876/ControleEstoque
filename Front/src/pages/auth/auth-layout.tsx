import type { ReactNode } from "react"
import { Boxes, ShieldCheck, TrendingDown } from "lucide-react"
import { useDocumentTitle } from "@/hooks/use-document-title"

interface AuthLayoutProps {
  title: string
  description: string
  children: ReactNode
}

const destaques = [
  {
    icon: Boxes,
    titulo: "Controle centralizado",
    descricao: "Produtos, categorias e estoque da empresa em um só lugar.",
  },
  {
    icon: TrendingDown,
    titulo: "Alertas de estoque baixo",
    descricao: "Saiba na hora quais produtos precisam de reposição.",
  },
  {
    icon: ShieldCheck,
    titulo: "Histórico auditável",
    descricao: "Toda entrada, saída e estorno de estoque fica registrado.",
  },
]

// Painel de marca fixo em tom escuro (não segue o tema claro/escuro do app):
// é conteúdo institucional, não interface, e mantém a identidade visual estável.
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  useDocumentTitle(title)

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-neutral-950 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, var(--brand) 0%, transparent 45%), radial-gradient(circle at 85% 90%, var(--brand) 0%, transparent 40%)",
            opacity: 0.35,
          }}
        />

        <div className="relative flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-brand-foreground">
            CE
          </div>
          <span className="text-sm font-semibold">Controle de Estoque</span>
        </div>

        <div className="relative space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Gestão de estoque sem planilha, sem dor de cabeça.
            </h2>
            <p className="text-white/60">
              Feito para pequenas e médias empresas que precisam saber, a qualquer momento, o que tem e o que
              falta.
            </p>
          </div>

          <ul className="space-y-5">
            {destaques.map((item) => (
              <li key={item.titulo} className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <item.icon className="size-4.5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.titulo}</p>
                  <p className="text-sm text-white/50">{item.descricao}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          © {new Date().getFullYear()} Controle de Estoque. Todos os direitos reservados.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center gap-8 bg-background p-6 py-12">
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-brand-foreground">
            CE
          </div>
          <span className="text-sm font-semibold">Controle de Estoque</span>
        </div>

        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
