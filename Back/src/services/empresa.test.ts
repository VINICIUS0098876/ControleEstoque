import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMock = {
    empresa: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    usuario: {
        findUnique: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
}

vi.mock('../conf/prisma.js', () => ({
    default: prismaMock,
}))

const bcryptMock = {
    hash: vi.fn(),
}

vi.mock('bcryptjs', () => bcryptMock)

const { CreateEmpresaService, UpdateEmpresaService, DeleteEmpresaService, GetEmpresaService } = await import(
    './empresa.js'
)

const empresaPayload = {
    nome: 'Loja Teste',
    cnpj: '12345678000199',
    adminNome: 'Admin Teste',
    adminEmail: 'admin@empresa.com',
    adminSenha: 'senha123',
}

beforeEach(() => {
    vi.clearAllMocks()
    // $transaction aqui cobre as duas formas usadas pelo service: callback (interactive
    // transaction, usada por CreateEmpresaService) e array (usada por DeleteEmpresaService).
    // Como o "tx" de uma interactive transaction expõe a mesma API do client principal,
    // reusar o prismaMock como tx é equivalente pro que os testes verificam.
    prismaMock.$transaction.mockImplementation((arg: unknown) => {
        if (typeof arg === 'function') return (arg as (tx: typeof prismaMock) => unknown)(prismaMock)
        return Promise.all(arg as Promise<unknown>[])
    })
})

describe('CreateEmpresaService', () => {
    it('lança 409 quando já existe empresa com esse CNPJ', async () => {
        prismaMock.empresa.findUnique.mockResolvedValue({ id: 'empresa-existente' })

        const service = new CreateEmpresaService()

        await expect(service.execute(empresaPayload)).rejects.toMatchObject({ statusCode: 409 })
        expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled()
        expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })

    it('lança 409 quando já existe uma conta com o e-mail do admin', async () => {
        prismaMock.empresa.findUnique.mockResolvedValue(null)
        prismaMock.usuario.findUnique.mockResolvedValue({ id: 'usuario-existente' })

        const service = new CreateEmpresaService()

        await expect(service.execute(empresaPayload)).rejects.toMatchObject({ statusCode: 409 })
        expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })

    it('cria a empresa e o usuário ADMIN na mesma transação, com a senha hasheada', async () => {
        prismaMock.empresa.findUnique.mockResolvedValue(null)
        prismaMock.usuario.findUnique.mockResolvedValue(null)
        bcryptMock.hash.mockResolvedValue('hash-da-senha')
        const empresaCriada = { id: 'empresa-1', nome: 'Loja Teste', cnpj: empresaPayload.cnpj }
        prismaMock.empresa.create.mockResolvedValue(empresaCriada)
        prismaMock.usuario.create.mockResolvedValue({ id: 'usuario-1' })

        const service = new CreateEmpresaService()
        const resultado = await service.execute(empresaPayload)

        expect(resultado).toEqual(empresaCriada)
        expect(bcryptMock.hash).toHaveBeenCalledWith('senha123', 10)
        expect(prismaMock.usuario.create).toHaveBeenCalledWith({
            data: {
                nome: 'Admin Teste',
                email: 'admin@empresa.com',
                senha: 'hash-da-senha',
                papel: 'ADMIN',
                empresaId: 'empresa-1',
            },
        })
    })
})

describe('UpdateEmpresaService', () => {
    const dadosAtualizados = { nome: 'Loja Teste 2', cnpj: '12345678000199' }

    it('lança 404 quando a empresa não existe ou está inativa', async () => {
        prismaMock.empresa.findFirst.mockResolvedValue(null)

        const service = new UpdateEmpresaService()

        await expect(service.execute('empresa-1', dadosAtualizados)).rejects.toMatchObject({ statusCode: 404 })
        expect(prismaMock.empresa.update).not.toHaveBeenCalled()
    })

    it('lança 409 quando o novo CNPJ já pertence a outra empresa', async () => {
        prismaMock.empresa.findFirst.mockResolvedValue({ id: 'empresa-1', cnpj: '00000000000000' })
        prismaMock.empresa.findUnique.mockResolvedValue({ id: 'outra-empresa' })

        const service = new UpdateEmpresaService()

        await expect(service.execute('empresa-1', dadosAtualizados)).rejects.toMatchObject({ statusCode: 409 })
        expect(prismaMock.empresa.update).not.toHaveBeenCalled()
    })

    it('não verifica duplicidade quando o CNPJ não muda', async () => {
        prismaMock.empresa.findFirst.mockResolvedValue({ id: 'empresa-1', cnpj: dadosAtualizados.cnpj })
        prismaMock.empresa.update.mockResolvedValue({ id: 'empresa-1', ...dadosAtualizados })

        const service = new UpdateEmpresaService()
        await service.execute('empresa-1', dadosAtualizados)

        expect(prismaMock.empresa.findUnique).not.toHaveBeenCalled()
        expect(prismaMock.empresa.update).toHaveBeenCalledWith({
            where: { id: 'empresa-1' },
            data: {
                nome: 'Loja Teste 2',
                cnpj: dadosAtualizados.cnpj,
                logoUrl: null,
                temaCor: null,
            },
        })
    })
})

describe('DeleteEmpresaService', () => {
    it('lança 404 quando a empresa não existe ou já está inativa', async () => {
        prismaMock.empresa.findFirst.mockResolvedValue(null)

        const service = new DeleteEmpresaService()

        await expect(service.execute('empresa-1')).rejects.toMatchObject({ statusCode: 404 })
        expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })

    it('desativa a empresa e todos os seus usuários, e libera o CNPJ', async () => {
        prismaMock.empresa.findFirst.mockResolvedValue({ id: 'empresa-1', ativo: true })
        prismaMock.usuario.updateMany.mockResolvedValue({ count: 2 })
        prismaMock.empresa.update.mockResolvedValue({
            id: 'empresa-1',
            nome: 'Loja Teste',
            cnpj: null,
            ativo: false,
            deletadoEm: new Date(),
        })

        const service = new DeleteEmpresaService()
        const resultado = await service.execute('empresa-1')

        expect(prismaMock.usuario.updateMany).toHaveBeenCalledWith({
            where: { empresaId: 'empresa-1' },
            data: { ativo: false, deletadoEm: expect.any(Date) },
        })
        expect(prismaMock.empresa.update).toHaveBeenCalledWith({
            where: { id: 'empresa-1' },
            data: { ativo: false, deletadoEm: expect.any(Date), cnpj: null },
            select: { id: true, nome: true, cnpj: true, ativo: true, deletadoEm: true },
        })
        expect(resultado).toMatchObject({ id: 'empresa-1', cnpj: null, ativo: false })
    })
})

describe('GetEmpresaService', () => {
    it('lança 404 quando a empresa não existe ou está inativa', async () => {
        prismaMock.empresa.findFirst.mockResolvedValue(null)

        const service = new GetEmpresaService()

        await expect(service.execute('empresa-1')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('retorna a empresa ativa', async () => {
        const empresa = { id: 'empresa-1', nome: 'Loja Teste', ativo: true }
        prismaMock.empresa.findFirst.mockResolvedValue(empresa)

        const service = new GetEmpresaService()
        const resultado = await service.execute('empresa-1')

        expect(resultado).toEqual(empresa)
    })
})
