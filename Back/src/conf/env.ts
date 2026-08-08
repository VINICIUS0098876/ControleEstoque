import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
    DATABASE_URL: z.string().min(1, { message: 'DATABASE_URL é obrigatória.' }),
    SECRET_KEY: z.string().min(32, { message: 'SECRET_KEY deve ter pelo menos 32 caracteres para ser segura.' }),
    PORT: z.string().regex(/^\d+$/, { message: 'PORT deve ser um número.' }).optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGIN: z.string().optional(),
    // Sobrescreve o teto do authLimiter (padrão: 10/hora, ver server.ts). Existe só para a
    // suíte E2E (Front/playwright.config.ts) rodar contra um Back dedicado com um teto bem
    // mais alto, sem depender do valor pensado pra proteção real de força bruta em produção
    // — nunca setada fora desse cenário, então o padrão de produção não muda.
    AUTH_RATE_LIMIT_MAX: z.string().regex(/^\d+$/, { message: 'AUTH_RATE_LIMIT_MAX deve ser um número.' }).optional(),
})

// Validado uma única vez no boot: se faltar ou for inválida alguma variável de
// ambiente crítica, a aplicação falha aqui (com uma mensagem clara) em vez de
// quebrar de forma obscura no meio de uma requisição em produção.
const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
    console.error('Configuração inválida: variáveis de ambiente ausentes ou incorretas.')
    for (const issue of parsedEnv.error.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
}

export const env = parsedEnv.data
