import { resend } from '../conf/resend.js'
import { env } from '../conf/env.js'
import { logger } from '../conf/logger.js'
import { AppError } from '../utils/AppError.js'

// Fora de produção, RESEND_API_KEY/RESEND_FROM_EMAIL podem não estar configuradas (env.ts
// só as exige quando NODE_ENV === 'production'). Sem provedor configurado, o e-mail é
// apenas logado — permite rodar e testar o fluxo de redefinição de senha localmente sem
// precisar de uma conta Resend.
function isEmailProviderConfigured(): boolean {
    return resend !== null && !!env.RESEND_FROM_EMAIL
}

function montarHtmlRedefinicaoSenha(nome: string, resetUrl: string): string {
    return `
        <p>Olá, ${nome}.</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no Controle de Estoque.</p>
        <p><a href="${resetUrl}">Clique aqui para escolher uma nova senha</a>. O link expira em 30 minutos.</p>
        <p>Se você não pediu essa redefinição, pode ignorar este e-mail — sua senha continua a mesma.</p>
    `.trim()
}

export async function sendPasswordResetEmail(to: string, nome: string, resetUrl: string): Promise<void> {
    if (!isEmailProviderConfigured()) {
        logger.warn(
            { to, resetUrl },
            'RESEND_API_KEY/RESEND_FROM_EMAIL não configuradas — e-mail de redefinição de senha não foi enviado, link acima'
        )
        return
    }

    const { error } = await resend!.emails.send({
        from: env.RESEND_FROM_EMAIL!,
        to,
        subject: 'Redefinição de senha — Controle de Estoque',
        html: montarHtmlRedefinicaoSenha(nome, resetUrl),
    })

    if (error) {
        logger.error({ err: error, to }, 'Falha ao enviar e-mail de redefinição de senha via Resend')
        throw new AppError('Não foi possível enviar o e-mail de redefinição de senha. Tente novamente em instantes.', 500)
    }
}
