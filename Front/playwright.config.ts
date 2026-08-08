import { defineConfig, devices } from "@playwright/test"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Suíte de ponta a ponta contra o Back e o Front reais rodando localmente (não uma API
// mockada) — de propósito: os bugs que essa suíte existe para prevenir (ex: o botão
// "Excluir" que renderizava azul em vez de vermelho, o diálogo de exclusão que piscava
// "undefined") só aparecem na integração real entre front, back e banco, não em testes
// isolados de componente. Cada teste cadastra sua própria empresa com e-mail/CNPJ únicos
// (timestamp), então os testes não interferem entre si e podem rodar contra o banco de
// desenvolvimento normalmente.
export default defineConfig({
  testDir: "./e2e",
  // Sequencial de propósito, não paralelo: os testes batem num Back real compartilhado
  // que tem rate limiting de verdade (express-rate-limit, ~100 req/15min por IP) e faz
  // hash de senha com bcrypt (custo de CPU real) a cada cadastro/login — rodar vários
  // testes ao mesmo tempo contra esse único processo already causou timeouts/429 por
  // contenção, não por bug de produto. Se a suíte crescer muito, vale reavaliar com um
  // rate limit mais alto num ambiente de teste dedicado.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 30_000,

  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Sobe Back e Front automaticamente antes da suíte (e derruba ao final), a menos que já
  // estejam rodando (reuseExistingServer) — útil ao iterar localmente com `npm run dev`
  // já ativo nos dois. Em CI, sempre sobe do zero.
  webServer: [
    {
      command: "npm run dev",
      cwd: path.resolve(__dirname, "../Back"),
      url: "http://localhost:3000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      // O authLimiter de produção (10 tentativas/hora, ver Back/src/server.ts) existe pra
      // frear força bruta — não pra travar uma suíte que legitimamente faz login várias
      // vezes numa mesma rodada. AUTH_RATE_LIMIT_MAX só existe pra esse cenário (ver
      // Back/src/conf/env.ts); fora daqui, o Back sempre sobe com o teto seguro padrão.
      env: { AUTH_RATE_LIMIT_MAX: "1000" },
    },
    {
      command: "npm run dev",
      cwd: __dirname,
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})
