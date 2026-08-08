import { QueryClient } from "@tanstack/react-query"
import axios from "axios"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Erros 4xx (404, 400, 401...) são definitivos — retentar não muda o resultado,
      // só atrasa em dobro a mensagem de erro pro usuário. Só vale a pena retentar
      // falha de rede/timeout (sem response) ou erro do servidor (5xx).
      retry: (failureCount, error) => {
        if (axios.isAxiosError(error) && error.response && error.response.status < 500) {
          return false
        }
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
  },
})
