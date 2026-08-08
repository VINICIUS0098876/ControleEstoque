import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMock = {
    usuario: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    refreshToken: {
        deleteMany: vi.fn(),
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

const { CreateFuncionarioService, DeactivateUserService, AdminUpdateUsuarioService, AdminResetPasswordService } = await import('./usuario.js')

const empresaId = 'empresa-1'

beforeEach(() => {
    vi.clearAllMocks()
    // $transaction em array-form apenas resolve as promises já criadas pelas chamadas
    // do Prisma passadas a ele — replica esse comportamento no mock (ver movimentacao.test.ts).
    prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))
})

describe('CreateFuncionarioService', () => {
    it('lança 409 quando já existe um usuário (de qualquer empresa) com esse e-mail', async () => {
        prismaMock.usuario.findUnique.mockResolvedValue({ id: 'outro-usuario' })

        const service = new CreateFuncionarioService()

        await expect(
            service.execute({ nome: 'João', email: 'joao@empresa.com', senha: 'senha123', empresaId })
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(prismaMock.usuario.create).not.toHaveBeenCalled()
    })

    it('cria o usuário sempre com papel FUNCIONARIO, na empresa de quem está autenticado, com a senha hasheada', async () => {
        prismaMock.usuario.findUnique.mockResolvedValue(null)
        bcryptMock.hash.mockResolvedValue('hash-da-senha')
        prismaMock.usuario.create.mockResolvedValue({ id: 'usuario-novo', papel: 'FUNCIONARIO' })

        const service = new CreateFuncionarioService()
        await service.execute({ nome: 'João', email: 'joao@empresa.com', senha: 'senha123', empresaId })

        expect(bcryptMock.hash).toHaveBeenCalledWith('senha123', 10)
        expect(prismaMock.usuario.create).toHaveBeenCalledWith({
            data: {
                nome: 'João',
                email: 'joao@empresa.com',
                senha: 'hash-da-senha',
                papel: 'FUNCIONARIO',
                empresaId,
            },
            select: {
                id: true,
                nome: true,
                email: true,
                papel: true,
                ativo: true,
                criadoEm: true,
            },
        })
    })
})

describe('DeactivateUserService', () => {
    it('lança 400 quando o ADMIN tenta desativar a própria conta por esta rota', async () => {
        const service = new DeactivateUserService()

        await expect(service.execute('usuario-1', empresaId, 'usuario-1')).rejects.toMatchObject({
            statusCode: 400,
        })
        expect(prismaMock.usuario.findFirst).not.toHaveBeenCalled()
    })

    it('lança 404 quando o usuário-alvo não existe, não é da mesma empresa ou já está inativo', async () => {
        prismaMock.usuario.findFirst.mockResolvedValue(null)

        const service = new DeactivateUserService()

        await expect(service.execute('usuario-2', empresaId, 'usuario-admin')).rejects.toMatchObject({
            statusCode: 404,
        })
        expect(prismaMock.usuario.update).not.toHaveBeenCalled()
    })

    it('desativa o usuário e invalida os refresh tokens dele na mesma transação', async () => {
        prismaMock.usuario.findFirst.mockResolvedValue({ id: 'usuario-2', empresaId, ativo: true })
        prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 1 })
        prismaMock.usuario.update.mockResolvedValue({ id: 'usuario-2', ativo: false })

        const service = new DeactivateUserService()
        const resultado = await service.execute('usuario-2', empresaId, 'usuario-admin')

        expect(resultado).toEqual({ id: 'usuario-2', ativo: false })
        expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { usuarioId: 'usuario-2' } })
        expect(prismaMock.usuario.update).toHaveBeenCalledWith({
            where: { id: 'usuario-2' },
            data: { ativo: false, deletadoEm: expect.any(Date) },
            select: { id: true, nome: true, email: true, ativo: true },
        })
    })
})

describe('AdminUpdateUsuarioService', () => {
    it('lança 404 quando o usuário-alvo não existe, não é da mesma empresa ou já está inativo', async () => {
        prismaMock.usuario.findFirst.mockResolvedValue(null)

        const service = new AdminUpdateUsuarioService()

        await expect(
            service.execute('usuario-2', empresaId, { nome: 'Novo Nome', email: 'novo@empresa.com' })
        ).rejects.toMatchObject({ statusCode: 404 })
        expect(prismaMock.usuario.update).not.toHaveBeenCalled()
    })

    it('lança 409 quando o novo e-mail já pertence a outro usuário', async () => {
        prismaMock.usuario.findFirst.mockResolvedValue({ id: 'usuario-2', empresaId, email: 'antigo@empresa.com', ativo: true })
        prismaMock.usuario.findUnique.mockResolvedValue({ id: 'outro-usuario' })

        const service = new AdminUpdateUsuarioService()

        await expect(
            service.execute('usuario-2', empresaId, { nome: 'Novo Nome', email: 'novo@empresa.com' })
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(prismaMock.usuario.update).not.toHaveBeenCalled()
    })

    it('atualiza nome e e-mail do usuário da própria empresa', async () => {
        prismaMock.usuario.findFirst.mockResolvedValue({ id: 'usuario-2', empresaId, email: 'antigo@empresa.com', ativo: true })
        prismaMock.usuario.findUnique.mockResolvedValue(null)
        prismaMock.usuario.update.mockResolvedValue({ id: 'usuario-2', nome: 'Novo Nome', email: 'novo@empresa.com', papel: 'FUNCIONARIO' })

        const service = new AdminUpdateUsuarioService()
        const resultado = await service.execute('usuario-2', empresaId, { nome: 'Novo Nome', email: 'novo@empresa.com' })

        expect(resultado).toEqual({ id: 'usuario-2', nome: 'Novo Nome', email: 'novo@empresa.com', papel: 'FUNCIONARIO' })
        expect(prismaMock.usuario.update).toHaveBeenCalledWith({
            where: { id: 'usuario-2' },
            data: { nome: 'Novo Nome', email: 'novo@empresa.com' },
            select: { id: true, nome: true, email: true, papel: true },
        })
    })
})

describe('AdminResetPasswordService', () => {
    it('lança 404 quando o usuário-alvo não existe, não é da mesma empresa ou já está inativo', async () => {
        prismaMock.usuario.findFirst.mockResolvedValue(null)

        const service = new AdminResetPasswordService()

        await expect(service.execute('usuario-2', empresaId)).rejects.toMatchObject({ statusCode: 404 })
        expect(prismaMock.usuario.update).not.toHaveBeenCalled()
    })

    it('gera uma senha provisória, invalida os refresh tokens e retorna a senha em texto plano', async () => {
        prismaMock.usuario.findFirst.mockResolvedValue({ id: 'usuario-2', empresaId, ativo: true })
        prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 1 })
        bcryptMock.hash.mockResolvedValue('hash-da-senha-provisoria')
        prismaMock.usuario.update.mockResolvedValue({ id: 'usuario-2', nome: 'Funcionário', email: 'func@empresa.com' })

        const service = new AdminResetPasswordService()
        const resultado = await service.execute('usuario-2', empresaId)

        expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { usuarioId: 'usuario-2' } })
        expect(bcryptMock.hash).toHaveBeenCalledWith(resultado.senhaProvisoria, 10)
        expect(prismaMock.usuario.update).toHaveBeenCalledWith({
            where: { id: 'usuario-2' },
            data: { senha: 'hash-da-senha-provisoria' },
            select: { id: true, nome: true, email: true },
        })
        expect(typeof resultado.senhaProvisoria).toBe('string')
        expect(resultado.senhaProvisoria.length).toBeGreaterThanOrEqual(6)
        expect(resultado).toMatchObject({ id: 'usuario-2', nome: 'Funcionário', email: 'func@empresa.com' })
    })
})
