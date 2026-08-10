import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/sonner"
import { queryClient } from "@/lib/query-client"
import { useAuthBootstrap } from "@/hooks/use-auth"
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/protected-route"
import { AdminRoute } from "@/components/auth/admin-route"
import { GlobalAuthListener } from "@/components/auth/global-auth-listener"
import { ThemeSync } from "@/components/theme-sync"
import { AppLayout } from "@/components/layout/app-layout"
import { LoginPage } from "@/pages/auth/login-page"
import { CadastroEmpresaPage } from "@/pages/auth/cadastro-empresa-page"
import { ForgotPasswordPage } from "@/pages/auth/forgot-password-page"
import { ResetPasswordPage } from "@/pages/auth/reset-password-page"
import { DashboardPage } from "@/pages/dashboard/dashboard-page"
import { PdvPage } from "@/pages/vendas/pdv-page"
import { VendasPage } from "@/pages/vendas/vendas-page"
import { VendaDetalhePage } from "@/pages/vendas/venda-detalhe-page"
import { ProdutosPage } from "@/pages/produtos/produtos-page"
import { ProdutoDetalhePage } from "@/pages/produtos/produto-detalhe-page"
import { CategoriasPage } from "@/pages/categorias/categorias-page"
import { ClientesPage } from "@/pages/clientes/clientes-page"
import { ClienteDetalhePage } from "@/pages/clientes/cliente-detalhe-page"
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
        <Route path="/esqueci-a-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pdv" element={<PdvPage />} />
          <Route path="/vendas" element={<VendasPage />} />
          <Route path="/vendas/:id" element={<VendaDetalhePage />} />
          <Route path="/produtos" element={<ProdutosPage />} />
          <Route path="/produtos/:id" element={<ProdutoDetalhePage />} />
          <Route path="/categorias" element={<CategoriasPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/:id" element={<ClienteDetalhePage />} />
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
        <ThemeSync />
        <AppRoutes />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
