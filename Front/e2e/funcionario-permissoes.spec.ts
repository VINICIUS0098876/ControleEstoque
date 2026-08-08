import { test, expect } from "@playwright/test"
import { gerarEmpresaTeste, cadastrarEmpresa, login } from "./helpers.js"

test.describe("Criação de funcionário e permissões restritas", () => {
  test("ADMIN cria um funcionário, que só acessa as telas permitidas", async ({ page }) => {
    const empresa = gerarEmpresaTeste("func")
    // ".equipe" extra no local-part garante que este e-mail nunca bate com o do ADMIN
    // (gerado por gerarEmpresaTeste com o mesmo prefixo "func"): sem essa diferença, os
    // dois Date.now() — um dentro de gerarEmpresaTeste, outro aqui, chamados em sequência
    // sem I/O no meio — podem cair no mesmo milissegundo e colidir, fazendo o cadastro do
    // funcionário falhar com 409 (e-mail já usado pelo próprio ADMIN da empresa recém-criada).
    const funcEmail = `e2e.func.equipe.${Date.now()}@example.com`
    const funcSenha = "senha456"

    await cadastrarEmpresa(page, empresa)
    await login(page, empresa.adminEmail, empresa.adminSenha)

    await page.goto("/usuarios")
    await page.getByRole("button", { name: "Novo funcionário" }).click()
    await page.locator('[name="nome"]').fill("Funcionário E2E")
    await page.locator('[name="email"]').fill(funcEmail)
    await page.locator('[name="senha"]').fill(funcSenha)
    await page.getByRole("button", { name: "Cadastrar" }).click()
    await expect(page.getByText("Funcionário cadastrado com sucesso.")).toBeVisible()
    await expect(page.getByRole("row", { name: /Funcionário E2E/ })).toContainText("FUNCIONARIO")

    // E-mail duplicado -> 409 tratado, sem quebrar a tela.
    await page.getByRole("button", { name: "Novo funcionário" }).click()
    await page.locator('[name="nome"]').fill("Outro Nome")
    await page.locator('[name="email"]').fill(funcEmail)
    await page.locator('[name="senha"]').fill("outrasenha")
    await page.getByRole("button", { name: "Cadastrar" }).click()
    await expect(page.getByText("Email já cadastrado")).toBeVisible()
    await page.keyboard.press("Escape")

    await page.getByRole("button", { name: "Sair" }).click()
    await page.waitForURL("**/login")
    await login(page, funcEmail, funcSenha)

    // Nav não mostra as áreas restritas a ADMIN.
    await expect(page.getByRole("link", { name: "Usuários" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Configurações" })).toHaveCount(0)

    // Acesso direto pela URL é bloqueado (RequireRole) e redireciona pro dashboard.
    await page.goto("/usuarios")
    await expect(page).toHaveURL("/")
    await expect(page.getByText("Você não tem permissão para acessar essa página.")).toBeVisible()

    await page.goto("/configuracoes")
    await expect(page).toHaveURL("/")

    // Áreas permitidas continuam funcionando normalmente.
    await page.goto("/produtos")
    await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible()
  })

  test("ADMIN pode desativar um funcionário, que perde acesso imediatamente", async ({ page, browser }) => {
    const empresa = gerarEmpresaTeste("desativa")
    // ".equipe" extra: mesmo motivo do teste anterior (evita colidir com o e-mail do ADMIN).
    const funcEmail = `e2e.desativa.equipe.${Date.now()}@example.com`
    const funcSenha = "senha456"

    await cadastrarEmpresa(page, empresa)
    await login(page, empresa.adminEmail, empresa.adminSenha)

    await page.goto("/usuarios")
    await page.getByRole("button", { name: "Novo funcionário" }).click()
    await page.locator('[name="nome"]').fill("Funcionário Para Desativar")
    await page.locator('[name="email"]').fill(funcEmail)
    await page.locator('[name="senha"]').fill(funcSenha)
    await page.getByRole("button", { name: "Cadastrar" }).click()
    await expect(page.getByText("Funcionário cadastrado com sucesso.")).toBeVisible()

    // name exato (não substring): o nome do funcionário de teste contém a própria
    // palavra "Desativar", então um match por substring aqui bateria com qualquer um
    // dos 3 botões da linha (Editar dados/Redefinir senha/Desativar), já que os 3
    // aria-labels incluem o nome completo dele.
    const linhaFuncionario = page.getByRole("row", { name: /Funcionário Para Desativar/ })
    await linhaFuncionario.getByRole("button", { name: "Desativar Funcionário Para Desativar", exact: true }).click()
    await expect(page.getByText(/Tem certeza que deseja desativar "Funcionário Para Desativar"/)).toBeVisible()
    await page.getByRole("button", { name: "Desativar", exact: true }).click()
    await expect(page.getByText("Usuário desativado com sucesso.")).toBeVisible()
    await expect(linhaFuncionario.getByText("Inativo")).toBeVisible()

    // Contexto de navegador separado (não só uma nova aba do mesmo context): os cookies
    // httpOnly de sessão são por context, não por aba — uma outraAba = context.newPage()
    // herdaria o cookie do ADMIN (ainda logado em `page`) e o bootstrap da SPA
    // (useAuthBootstrap) restauraria a sessão dele automaticamente, fazendo o
    // PublicOnlyRoute redirecionar /login pra "/" antes mesmo do teste digitar algo.
    const outroContexto = await browser.newContext()
    const outraAba = await outroContexto.newPage()
    await outraAba.goto("/login")
    await outraAba.locator('[name="email"]').fill(funcEmail)
    await outraAba.locator('[name="senha"]').fill(funcSenha)
    await outraAba.getByRole("button", { name: "Entrar" }).click()
    await expect(outraAba.getByText("Credenciais de autenticação incorretas")).toBeVisible()
    await outroContexto.close()
  })

  test("ADMIN edita os dados de um funcionário e redefine a senha dele", async ({ page, browser }) => {
    const empresa = gerarEmpresaTeste("edita")
    // ".equipe" extra: mesmo motivo dos testes anteriores (evita colidir com o e-mail do ADMIN).
    const funcEmail = `e2e.edita.equipe.${Date.now()}@example.com`
    const funcSenhaOriginal = "senha456"

    await cadastrarEmpresa(page, empresa)
    await login(page, empresa.adminEmail, empresa.adminSenha)

    await page.goto("/usuarios")
    await page.getByRole("button", { name: "Novo funcionário" }).click()
    await page.locator('[name="nome"]').fill("Funcionário Original")
    await page.locator('[name="email"]').fill(funcEmail)
    await page.locator('[name="senha"]').fill(funcSenhaOriginal)
    await page.getByRole("button", { name: "Cadastrar" }).click()
    await expect(page.getByText("Funcionário cadastrado com sucesso.")).toBeVisible()

    // Editar: renomeia o funcionário e confirma que a lista reflete o novo nome.
    const linhaOriginal = page.getByRole("row", { name: /Funcionário Original/ })
    await linhaOriginal.getByRole("button", { name: "Editar dados de Funcionário Original" }).click()
    await expect(page.getByRole("heading", { name: "Editar funcionário" })).toBeVisible()
    await page.locator('[name="nome"]').fill("Funcionário Renomeado")
    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Usuário atualizado com sucesso.")).toBeVisible()
    const linhaRenomeada = page.getByRole("row", { name: /Funcionário Renomeado/ })
    await expect(linhaRenomeada).toBeVisible()

    // Redefinir senha: confirma, lê a senha provisória gerada na tela de resultado.
    await linhaRenomeada.getByRole("button", { name: "Redefinir senha de Funcionário Renomeado" }).click()
    await expect(
      page.getByText(/Uma nova senha provisória será gerada para "Funcionário Renomeado"/)
    ).toBeVisible()
    await page.getByRole("button", { name: "Redefinir", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Senha redefinida" })).toBeVisible()
    const novaSenha = await page.locator('input[readonly]').inputValue()
    expect(novaSenha.length).toBeGreaterThan(0)
    await page.getByRole("button", { name: "Concluído" }).click()

    // Contexto separado, não uma aba do mesmo context: ver comentário equivalente no
    // teste de desativação — evita herdar a sessão do ADMIN (ainda logado em `page`).
    const outroContexto = await browser.newContext()
    const outraAba = await outroContexto.newPage()

    // A senha antiga não funciona mais (sessão e credencial anteriores foram invalidadas)...
    await outraAba.goto("/login")
    await outraAba.locator('[name="email"]').fill(funcEmail)
    await outraAba.locator('[name="senha"]').fill(funcSenhaOriginal)
    await outraAba.getByRole("button", { name: "Entrar" }).click()
    await expect(outraAba.getByText("Credenciais de autenticação incorretas")).toBeVisible()

    // ...mas a nova senha provisória funciona.
    await outraAba.locator('[name="senha"]').fill(novaSenha)
    await outraAba.getByRole("button", { name: "Entrar" }).click()
    await outraAba.waitForURL("/")
    await outroContexto.close()
  })
})
