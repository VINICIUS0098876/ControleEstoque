import { test, expect } from "@playwright/test"
import { gerarEmpresaTeste, cadastrarEmpresa, login } from "./helpers.js"

test.describe("Configurações da empresa (white-label)", () => {
  test("prévia de cor de marca aplica em tempo real, reverte sem salvar e persiste ao salvar", async ({ page }) => {
    const empresa = gerarEmpresaTeste("branding")

    await cadastrarEmpresa(page, empresa)
    await login(page, empresa.adminEmail, empresa.adminSenha)

    // O badge de logo (iniciais da empresa) usa bg-brand sempre, em qualquer página — ao
    // contrário do link de nav "Configurações", cujo texto só fica na cor de marca quando
    // a rota está ativa. É o jeito estável de conferir a cor de marca independente de rota.
    const badgeLogo = page.locator(".bg-brand").first()

    await page.goto("/configuracoes")
    const campoCor = page.locator('[name="temaCor"]')
    // Empresa recém-cadastrada não tem temaCor customizado (fica null no banco — o
    // cadastro nem coleta esse campo), então o input começa vazio; "#0F4C81" que aparece
    // visualmente é só o placeholder, não um valor pré-preenchido.
    await expect(campoCor).toHaveValue("")
    await expect(campoCor).toHaveAttribute("placeholder", "#0F4C81")
    await expect(badgeLogo).toHaveCSS("background-color", "rgb(15, 76, 129)")

    // Prévia ao vivo: muda antes mesmo de salvar.
    await campoCor.fill("")
    await campoCor.fill("#B91C1C")
    await expect(badgeLogo).toHaveCSS("background-color", "rgb(185, 28, 28)")

    // Sair sem salvar reverte a prévia para a cor realmente persistida (sapphire default).
    await page.getByRole("link", { name: "Dashboard" }).click()
    await expect(badgeLogo).toHaveCSS("background-color", "rgb(15, 76, 129)")

    // Agora salva de verdade.
    await page.goto("/configuracoes")
    await page.locator('[name="temaCor"]').fill("")
    await page.locator('[name="temaCor"]').fill("#B91C1C")
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText("Dados da empresa atualizados com sucesso.")).toBeVisible()

    // Persistiu: um reload não volta pra cor antiga.
    await page.reload()
    await expect(page.locator('[name="temaCor"]')).toHaveValue("#B91C1C")
    await expect(badgeLogo).toHaveCSS("background-color", "rgb(185, 28, 28)")
  })
})
