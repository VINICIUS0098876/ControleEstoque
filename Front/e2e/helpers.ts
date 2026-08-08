import type { Page } from "@playwright/test"

export interface EmpresaTeste {
  nomeEmpresa: string
  cnpj: string
  adminNome: string
  adminEmail: string
  adminSenha: string
}

// CNPJ/e-mail com timestamp: cada teste cria sua própria empresa isolada, sem depender
// de estado deixado por outro teste nem colidir com o unique constraint de CNPJ/e-mail.
export function gerarEmpresaTeste(prefixo: string): EmpresaTeste {
  const agora = Date.now()
  return {
    nomeEmpresa: `E2E ${prefixo} ${agora}`,
    cnpj: String(agora).padStart(14, "0").slice(-14),
    adminNome: "Admin E2E",
    adminEmail: `e2e.${prefixo}.${agora}@example.com`,
    adminSenha: "senha123",
  }
}

export async function cadastrarEmpresa(page: Page, empresa: EmpresaTeste) {
  await page.goto("/cadastro")
  await page.locator('[name="nome"]').fill(empresa.nomeEmpresa)
  await page.locator('[name="cnpj"]').fill(empresa.cnpj)
  await page.locator('[name="adminNome"]').fill(empresa.adminNome)
  await page.locator('[name="adminEmail"]').fill(empresa.adminEmail)
  await page.locator('[name="adminSenha"]').fill(empresa.adminSenha)
  await page.getByRole("button", { name: "Cadastrar" }).click()
  await page.waitForURL("**/login")
}

export async function login(page: Page, email: string, senha: string) {
  await page.locator('[name="email"]').fill(email)
  await page.locator('[name="senha"]').fill(senha)
  await page.getByRole("button", { name: "Entrar" }).click()
  await page.waitForURL("/")
}
