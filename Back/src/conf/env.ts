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
    // Usadas pelo fluxo de "esqueci minha senha" (ver services/email.ts). Opcionais fora de
    // produção: sem elas, o e-mail de redefinição é só logado no console (ver
    // isEmailProviderConfigured em services/email.ts), o que permite rodar o projeto
    // localmente sem precisar de uma conta Resend.
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().optional(),
    // URL pública do front, usada para montar o link de redefinição de senha
    // (ex: `${FRONTEND_URL}/redefinir-senha?token=...`).
    FRONTEND_URL: z.string().optional(),
})
    // Em produção, o fallback de "logar no console" não existe — se o e-mail de
    // redefinição de senha não puder ser enviado de verdade, isso precisa quebrar o boot,
    // não falhar silenciosamente na primeira requisição de um usuário em produção.
    .refine((data) => data.NODE_ENV !== 'production' || !!data.RESEND_API_KEY, {
        message: 'RESEND_API_KEY é obrigatória em produção (necessária para enviar e-mail de redefinição de senha).',
        path: ['RESEND_API_KEY'],
    })
    .refine((data) => data.NODE_ENV !== 'production' || !!data.RESEND_FROM_EMAIL, {
        message: 'RESEND_FROM_EMAIL é obrigatória em produção.',
        path: ['RESEND_FROM_EMAIL'],
    })
    .refine((data) => data.NODE_ENV !== 'production' || !!data.FRONTEND_URL, {
        message: 'FRONTEND_URL é obrigatória em produção (usada para montar o link de redefinição de senha).',
        path: ['FRONTEND_URL'],
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
