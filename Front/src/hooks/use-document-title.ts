import { useEffect } from "react"

const APP_NAME = "Controle de Estoque"

// Cada página chama isso com seu próprio título — inclusive o único caso dinâmico
// (produto-detalhe-page, com o nome do produto), que não teria como ser resolvido
// numa tabela estática de rota -> título.
//
// De propósito, NÃO restaura o título anterior no cleanup: numa SPA, quando uma
// página desmonta é porque outra está montando no lugar dela, e essa outra página
// já define o próprio título. Restaurar no unmount cria uma corrida — dependendo da
// ordem em que React executa cleanup (página antiga) vs. effect (página nova) entre
// componentes de posições diferentes na árvore (ex: layout público -> layout logado
// após o login), a restauração pode rodar DEPOIS do título novo e sobrescrevê-lo.
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])
}
