import { Resend } from 'resend'
import { env } from './env.js'

// Fora de produção, RESEND_API_KEY pode não estar configurada (ver services/email.ts,
// que usa isEmailProviderConfigured para decidir entre enviar de verdade ou só logar).
// Por isso o client só é instanciado quando a chave existe — não faz sentido criar um
// Resend() com chave vazia.
export const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
