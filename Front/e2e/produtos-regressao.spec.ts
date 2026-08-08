import { test, expect } from "@playwright/test"
import { gerarEmpresaTeste, cadastrarEmpresa, login } from "./helpers.js"

// Estas duas regressões já aconteceram de verdade nesta base de código (achadas testando
// manualmente no navegador, não por inspeção de código) — ficam fixadas aqui pra nunca
// voltarem em silêncio:
// 1. O diálogo de confirmação de exclusão chegou a mostrar "undefined" no lugar do nome
//    do produto, porque o estado "qual item" era zerado junto com o "aberto".
// 2. O botão "Excluir" (variant="destructive") renderizava com a cor primária (azul) em
//    vez de vermelha, porque AlertDialogAction mesclava className com variant de um jeito
//    que a classe de fundo correta perdia a briga de CSS.
test.describe("Regressões: exclusão de produto", () => {
  test("diálogo de exclusão mostra o nome correto do produto e o botão de excluir é vermelho, não azul", async ({
    page,
  }) => {
    const empresa = gerarEmpresaTeste("delete")
    await cadastrarEmpresa(page, empresa)
    await login(page, empresa.adminEmail, empresa.adminSenha)

    await page.goto("/produtos")
    await page.getByRole("button", { name: "Novo produto" }).click()
    await page.locator('[name="nome"]').fill("Produto Regressao Exclusao")
    await page.locator('[name="precoCusto"]').fill("10")
    await page.locator('[name="precoVenda"]').fill("20")
    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Produto criado com sucesso.")).toBeVisible()

    await page.getByRole("button", { name: /^Excluir Produto Regressao Exclusao/ }).click()

    const descricao = page.getByText(/Tem certeza que deseja excluir/)
    await expect(descricao).toContainText('"Produto Regressao Exclusao"')
    await expect(descricao).not.toContainText("undefined")

    // #0f4c81 (rgb(15, 76, 129)) é a cor primária/marca padrão — o bug fazia o botão
    // "Excluir" herdar exatamente essa cor em vez do vermelho de --destructive.
    const botaoExcluir = page.getByRole("button", { name: "Excluir", exact: true })
    await expect(botaoExcluir).not.toHaveCSS("color", "rgb(15, 76, 129)")
  })

  test("permite remover a categoria de um produto já cadastrado (voltar para 'Sem categoria')", async ({ page }) => {
    const empresa = gerarEmpresaTeste("catnull")
    await cadastrarEmpresa(page, empresa)
    await login(page, empresa.adminEmail, empresa.adminSenha)

    await page.goto("/categorias")
    await page.getByRole("button", { name: "Nova categoria" }).click()
    await page.locator('[name="nome"]').fill("Bebidas")
    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Categoria criada com sucesso.")).toBeVisible()

    await page.goto("/produtos")
    await page.getByRole("button", { name: "Novo produto" }).click()
    await page.locator('[name="nome"]').fill("Produto Com Categoria")
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "Bebidas" }).click()
    await page.locator('[name="precoCusto"]').fill("10")
    await page.locator('[name="precoVenda"]').fill("20")
    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Produto criado com sucesso.")).toBeVisible()

    const linha = page.getByRole("row", { name: /Produto Com Categoria/ })
    await expect(linha).toContainText("Bebidas")

    await linha.getByRole("button", { name: "Editar" }).click()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "Sem categoria" }).click()
    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Item atualizado com sucesso.")).toBeVisible()
    await expect(linha).not.toContainText("Bebidas")
  })

  test("campo de preço vazio é rejeitado como obrigatório, não é salvo como zero em silêncio", async ({ page }) => {
    const empresa = gerarEmpresaTeste("precovazio")
    await cadastrarEmpresa(page, empresa)
    await login(page, empresa.adminEmail, empresa.adminSenha)

    await page.goto("/produtos")
    await page.getByRole("button", { name: "Novo produto" }).click()
    await page.locator('[name="nome"]').fill("Produto Preco Vazio")
    await page.locator('[name="precoCusto"]').fill("10")
    await page.locator('[name="precoVenda"]').fill("20")
    await page.locator('[name="precoVenda"]').fill("")
    await page.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText(/preço de venda é obrigatório/i)).toBeVisible()
    await expect(page.getByText("Produto criado com sucesso.")).toHaveCount(0)
  })
})
