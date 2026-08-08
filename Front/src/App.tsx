import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/sonner"
import { queryClient } from "@/lib/query-client"
import { useAuthBootstrap } from "@/hooks/use-auth"
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/protected-route"
import { AdminRoute } from "@/components/auth/admin-route"
import { GlobalAuthListener } from "@/components/auth/global-auth-listener"
import { AppLayout } from "@/components/layout/app-layout"
import { LoginPage } from "@/pages/auth/login-page"
import { CadastroEmpresaPage } from "@/pages/auth/cadastro-empresa-page"
import { DashboardPage } from "@/pages/dashboard/dashboard-page"
import { ProdutosPage } from "@/pages/produtos/produtos-page"
import { ProdutoDetalhePage } from "@/pages/produtos/produto-detalhe-page"
import { CategoriasPage } from "@/pages/categorias/categorias-page"
import { UsuariosPage } from "@/pages/usuarios/usuarios-page"
import { PerfilPage } from "@/pages/perfil/perfil-page"
import { ConfiguracoesPage } from "@/pages/configuracoes/configuracoes-page"

function AppRoutes() {
  useAuthBootstrap()

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<CadastroEmpresaPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/produtos" element={<ProdutosPage />} />
          <Route path="/produtos/:id" element={<ProdutoDetalhePage />} />
          <Route path="/categorias" element={<CategoriasPage />} />
          <Route path="/perfil" element={<PerfilPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <GlobalAuthListener />
        <AppRoutes />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
