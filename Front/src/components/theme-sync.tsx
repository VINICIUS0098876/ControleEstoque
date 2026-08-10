import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { useAuthStore } from "@/stores/auth-store"

function chaveTemaDoUsuario(usuarioId: string) {
  return `theme:${usuarioId}`
}

// O next-themes guarda o tema escolhido numa única chave global do localStorage — num
// computador compartilhado por vários funcionários, isso faz a preferência de uma conta
// vazar pra outra (ex: funcionário muda pra claro; na próxima vez que o ADMIN logar nesse
// mesmo navegador, também está claro, mesmo ele tendo deixado escuro). Este componente
// mantém uma chave própria por usuário: ao trocar de conta (login/logout/troca), carrega
// o tema salvo dessa conta; a cada mudança de tema, salva na chave da conta logada no
// momento. Sem UI própria — só efeitos, no mesmo espírito do GlobalAuthListener.
export function ThemeSync() {
  const { theme, setTheme } = useTheme()
  const usuarioId = useAuthStore((s) => s.usuario?.id)
  const usuarioAnteriorRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (usuarioId === usuarioAnteriorRef.current) return
    usuarioAnteriorRef.current = usuarioId

    // Sem usuário logado (tela de login, ou acabou de deslogar): não há conta pra
    // carregar tema nenhum, deixa o que já está na tela.
    if (!usuarioId) return

    const temaSalvo = localStorage.getItem(chaveTemaDoUsuario(usuarioId))
    setTheme(temaSalvo ?? "system")
  }, [usuarioId, setTheme])

  useEffect(() => {
    if (!usuarioId || !theme) return
    localStorage.setItem(chaveTemaDoUsuario(usuarioId), theme)
  }, [usuarioId, theme])

  return null
}
