import { Component, type ErrorInfo, type ReactNode } from "react"
import { ErrorState } from "@/components/error-state"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

// Última linha de defesa contra erro de render não tratado: sem isso, um throw em
// qualquer componente da árvore desmonta a SPA inteira e deixa a tela em branco, sem
// nenhuma pista pro usuário nem registro do que aconteceu. Só existe como classe porque
// getDerivedStateFromError/componentDidCatch não têm equivalente em hooks.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Erro não tratado na árvore de componentes:", error, errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-svh items-center justify-center">
          <ErrorState
            title="Algo deu errado."
            description="Ocorreu um erro inesperado. Recarregue a página para continuar."
            onRetry={() => window.location.reload()}
          />
        </div>
      )
    }

    return this.props.children
  }
}
