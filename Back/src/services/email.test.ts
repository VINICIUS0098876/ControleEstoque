import { describe, it, expect, vi, beforeEach } from 'vitest'

const envMock: { RESEND_FROM_EMAIL?: string } = {}
vi.mock('../conf/env.js', () => ({
    get env() {
        return envMock
    },
}))

const sendMock = vi.fn()
let resendMock: { emails: { send: typeof sendMock } } | null = null
vi.mock('../conf/resend.js', () => ({
    get resend() {
        return resendMock
    },
}))

const loggerMock = {
    warn: vi.fn(),
    error: vi.fn(),
}
vi.mock('../conf/logger.js', () => ({
    logger: loggerMock,
}))

const { sendPasswordResetEmail } = await import('./email.js')

beforeEach(() => {
    vi.clearAllMocks()
    resendMock = null
    delete envMock.RESEND_FROM_EMAIL
})

describe('sendPasswordResetEmail', () => {
    it('apenas loga (não lança e não tenta enviar) quando o provedor de e-mail não está configurado', async () => {
        await sendPasswordResetEmail('joao@empresa.com', 'João', 'http://localhost:5173/redefinir-senha?token=abc')

        expect(loggerMock.warn).toHaveBeenCalledTimes(1)
        expect(sendMock).not.toHaveBeenCalled()
    })

    it('apenas loga quando há client do Resend mas falta RESEND_FROM_EMAIL', async () => {
        resendMock = { emails: { send: sendMock } }

        await sendPasswordResetEmail('joao@empresa.com', 'João', 'http://localhost:5173/redefinir-senha?token=abc')

        expect(loggerMock.warn).toHaveBeenCalledTimes(1)
        expect(sendMock).not.toHaveBeenCalled()
    })

    it('envia o e-mail via Resend quando totalmente configurado', async () => {
        resendMock = { emails: { send: sendMock } }
        envMock.RESEND_FROM_EMAIL = 'Controle de Estoque <naoresponda@exemplo.com>'
        sendMock.mockResolvedValue({ data: { id: 'email-1' }, error: null })

        await sendPasswordResetEmail('joao@empresa.com', 'João', 'http://localhost:5173/redefinir-senha?token=abc')

        expect(sendMock).toHaveBeenCalledWith(
            expect.objectContaining({
                from: 'Controle de Estoque <naoresponda@exemplo.com>',
                to: 'joao@empresa.com',
                subject: expect.any(String),
                html: expect.stringContaining('http://localhost:5173/redefinir-senha?token=abc'),
            })
        )
        expect(loggerMock.warn).not.toHaveBeenCalled()
    })

    it('lança AppError 500 quando o Resend retorna erro', async () => {
        resendMock = { emails: { send: sendMock } }
        envMock.RESEND_FROM_EMAIL = 'Controle de Estoque <naoresponda@exemplo.com>'
        sendMock.mockResolvedValue({ data: null, error: { message: 'Falha simulada' } })

        await expect(
            sendPasswordResetEmail('joao@empresa.com', 'João', 'http://localhost:5173/redefinir-senha?token=abc')
        ).rejects.toMatchObject({ statusCode: 500 })

        expect(loggerMock.error).toHaveBeenCalledTimes(1)
    })
})
