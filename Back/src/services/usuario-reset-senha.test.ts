import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

const prismaMock = {
    usuario: {
        findFirst: vi.fn(),
        update: vi.fn(),
    },
    refreshToken: {
        deleteMany: vi.fn(),
    },
    passwordResetToken: {
        deleteMany: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
    },
    $transaction: vi.fn(),
}

vi.mock('../conf/prisma.js', () => ({
    default: prismaMock,
}))

const bcryptMock = {
    hash: vi.fn(),
    compare: vi.fn(),
}

vi.mock('bcryptjs', () => bcryptMock)

const sendPasswordResetEmailMock = vi.fn()

vi.mock('./email.js', () => ({
    sendPasswordResetEmail: sendPasswordResetEmailMock,
}))

const { ForgotPasswordService, ResetPasswordService } = await import('./usuario.js')

const frontendUrl = 'http://localhost:5173'

function hashDoToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
}

beforeEach(() => {
    vi.clearAllMocks()
    // $transaction em array-form apenas resolve as promises já criadas pelas chamadas
    // do Prisma passadas a ele — replica esse comportamento no mock (ver movimentacao.test.ts).
    prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))
})

describe('ForgotPasswordService', () => {
    it('não cria token nem envia e-mail quando o e-mail não pertence a nenhum usuário ativo', async () => {
        prismaMock.usuario.findFirst.mockResolvedValue(null)

        const service = new ForgotPasswordService()
        await service.execute('inexistente@empresa.com', frontendUrl)

        expect(prismaMock.passwordResetToken.deleteMany).not.toHaveBeenCalled()
        expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled()
        expect(sendPasswordResetEmailMock).not.toHaveBeenCalled()
    })

    it('invalida tokens anteriores do usuário, cria um novo token com expiração futura e envia o e-mail com o link', async () => {
        const agora = Math.floor(Date.now() / 1000)
        prismaMock.usuario.findFirst.mockResolvedValue({ id: 'usuario-1', email: 'joao@empresa.com', nome: 'João' })
        prismaMock.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 })
        prismaMock.passwordResetToken.create.mockResolvedValue({ id: 'token-1' })

        const service = new ForgotPasswordService()
        await service.execute('joao@empresa.com', frontendUrl)

        expect(prismaMock.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { usuarioId: 'usuario-1' } })

        expect(prismaMock.passwordResetToken.create).toHaveBeenCalledTimes(1)
        const dadosCriados = prismaMock.passwordResetToken.create.mock.calls[0]![0].data
        expect(dadosCriados.usuarioId).toBe('usuario-1')
        expect(typeof dadosCriados.tokenHash).toBe('string')
        expect(dadosCriados.tokenHash).toHaveLength(64) // hex de sha256
        expect(dadosCriados.expiresIn).toBeGreaterThan(agora)
        expect(dadosCriados.expiresIn).toBeLessThanOrEqual(agora + 30 * 60)

        expect(sendPasswordResetEmailMock).toHaveBeenCalledTimes(1)
        const [to, nome, resetUrl] = sendPasswordResetEmailMock.mock.calls[0]!
        expect(to).toBe('joao@empresa.com')
        expect(nome).toBe('João')
        expect(resetUrl.startsWith(`${frontendUrl}/redefinir-senha?token=`)).toBe(true)

        // O hash salvo no banco precisa corresponder ao token que foi de fato enviado por
        // e-mail, senão ResetPasswordService nunca encontraria esse token depois.
        const tokenEnviado = resetUrl.split('token=')[1]
        expect(dadosCriados.tokenHash).toBe(hashDoToken(tokenEnviado))
    })
})

describe('ResetPasswordService', () => {
    it('lança 400 quando o token não existe', async () => {
        prismaMock.passwordResetToken.findUnique.mockResolvedValue(null)

        const service = new ResetPasswordService()

        await expect(service.execute('token-invalido', 'novaSenha123')).rejects.toMatchObject({ statusCode: 400 })
        expect(prismaMock.usuario.update).not.toHaveBeenCalled()
    })

    it('lança 400 quando o usuário dono do token está inativo', async () => {
        prismaMock.passwordResetToken.findUnique.mockResolvedValue({
            id: 'reset-1',
            usuarioId: 'usuario-1',
            expiresIn: Math.floor(Date.now() / 1000) + 1000,
            usuario: { ativo: false },
        })

        const service = new ResetPasswordService()

        await expect(service.execute('token-valido', 'novaSenha123')).rejects.toMatchObject({ statusCode: 400 })
        expect(prismaMock.usuario.update).not.toHaveBeenCalled()
    })

    it('lança 400 e apaga o token quando ele já expirou', async () => {
        prismaMock.passwordResetToken.findUnique.mockResolvedValue({
            id: 'reset-1',
            usuarioId: 'usuario-1',
            expiresIn: Math.floor(Date.now() / 1000) - 1000,
            usuario: { ativo: true },
        })

        const service = new ResetPasswordService()

        await expect(service.execute('token-expirado', 'novaSenha123')).rejects.toMatchObject({ statusCode: 400 })
        expect(prismaMock.passwordResetToken.delete).toHaveBeenCalledWith({ where: { id: 'reset-1' } })
        expect(prismaMock.usuario.update).not.toHaveBeenCalled()
    })

    it('busca o token pelo hash do valor recebido, nunca pelo valor em texto plano', async () => {
        prismaMock.passwordResetToken.findUnique.mockResolvedValue(null)

        const service = new ResetPasswordService()
        await expect(service.execute('token-em-texto-plano', 'novaSenha123')).rejects.toBeDefined()

        expect(prismaMock.passwordResetToken.findUnique).toHaveBeenCalledWith({
            where: { tokenHash: hashDoToken('token-em-texto-plano') },
            include: { usuario: true },
        })
    })

    it('troca a senha, consome o token e invalida os refresh tokens na mesma transação', async () => {
        prismaMock.passwordResetToken.findUnique.mockResolvedValue({
            id: 'reset-1',
            usuarioId: 'usuario-1',
            expiresIn: Math.floor(Date.now() / 1000) + 1000,
            usuario: { ativo: true },
        })
        bcryptMock.hash.mockResolvedValue('hash-da-nova-senha')

        const service = new ResetPasswordService()
        await service.execute('token-valido', 'novaSenha123')

        expect(bcryptMock.hash).toHaveBeenCalledWith('novaSenha123', 10)
        expect(prismaMock.passwordResetToken.delete).toHaveBeenCalledWith({ where: { id: 'reset-1' } })
        expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { usuarioId: 'usuario-1' } })
        expect(prismaMock.usuario.update).toHaveBeenCalledWith({
            where: { id: 'usuario-1' },
            data: { senha: 'hash-da-nova-senha' },
            select: { id: true },
        })
    })
})
