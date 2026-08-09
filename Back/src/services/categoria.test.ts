import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMock = {
    categoria: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    empresa: {
        findFirst: vi.fn(),
    },
}

vi.mock('../conf/prisma.js', () => ({
    default: prismaMock,
}))

const {
    CreateCategoriaService,
    UpdateCategoriaService,
    DeleteCategoriaService,
    GetCategoriaService,
    ListCategoriaService,
} = await import('./categoria.js')

const empresaId = 'empresa-1'

beforeEach(() => {
    vi.clearAllMocks()
})

describe('CreateCategoriaService', () => {
    it('lança 409 quando já existe categoria ativa com o mesmo nome na empresa', async () => {
        prismaMock.categoria.findFirst.mockResolvedValue({ id: 'categoria-existente' })

        const service = new CreateCategoriaService()

        await expect(service.execute({ nome: 'Bebidas', empresaId })).rejects.toMatchObject({ statusCode: 409 })
        expect(prismaMock.categoria.create).not.toHaveBeenCalled()
    })

    it('cria a categoria quando o nome não está em uso na empresa', async () => {
        prismaMock.categoria.findFirst.mockResolvedValue(null)
        prismaMock.categoria.create.mockResolvedValue({ id: 'categoria-1', nome: 'Bebidas' })

        const service = new CreateCategoriaService()
        const resultado = await service.execute({ nome: 'Bebidas', empresaId })

        expect(resultado).toEqual({ id: 'categoria-1', nome: 'Bebidas' })
        expect(prismaMock.categoria.create).toHaveBeenCalledWith({
            data: { nome: 'Bebidas', empresaId },
            select: { id: true, nome: true },
        })
    })
})

describe('UpdateCategoriaService', () => {
    it('lança 404 quando a categoria não existe, não é da empresa ou já está inativa', async () => {
        prismaMock.categoria.findFirst.mockResolvedValueOnce(null)

        const service = new UpdateCategoriaService()

        await expect(
            service.execute('categoria-1', { nome: 'Bebidas', empresaId })
        ).rejects.toMatchObject({ statusCode: 404 })
        expect(prismaMock.categoria.update).not.toHaveBeenCalled()
    })

    it('lança 409 quando o novo nome já pertence a outra categoria ativa da empresa', async () => {
        prismaMock.categoria.findFirst
            .mockResolvedValueOnce({ id: 'categoria-1' })
            .mockResolvedValueOnce({ id: 'categoria-2' })

        const service = new UpdateCategoriaService()

        await expect(
            service.execute('categoria-1', { nome: 'Bebidas', empresaId })
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(prismaMock.categoria.update).not.toHaveBeenCalled()
    })

    it('permite manter o próprio nome (o "conflito" é a própria categoria)', async () => {
        prismaMock.categoria.findFirst
            .mockResolvedValueOnce({ id: 'categoria-1' })
            .mockResolvedValueOnce({ id: 'categoria-1' })
        prismaMock.categoria.update.mockResolvedValue({ id: 'categoria-1', nome: 'Bebidas' })

        const service = new UpdateCategoriaService()
        const resultado = await service.execute('categoria-1', { nome: 'Bebidas', empresaId })

        expect(resultado).toEqual({ id: 'categoria-1', nome: 'Bebidas' })
        expect(prismaMock.categoria.update).toHaveBeenCalledWith({
            where: { id: 'categoria-1' },
            data: { nome: 'Bebidas' },
            select: { id: true, nome: true },
        })
    })
})

describe('DeleteCategoriaService', () => {
    it('lança 404 quando a categoria não existe, não é da empresa ou já está inativa', async () => {
        prismaMock.categoria.findFirst.mockResolvedValue(null)

        const service = new DeleteCategoriaService()

        await expect(service.execute('categoria-1', empresaId)).rejects.toMatchObject({ statusCode: 404 })
        expect(prismaMock.categoria.update).not.toHaveBeenCalled()
    })

    it('desativa (soft delete) a categoria da própria empresa', async () => {
        prismaMock.categoria.findFirst.mockResolvedValue({ id: 'categoria-1', empresaId, ativo: true })
        prismaMock.categoria.update.mockResolvedValue({ id: 'categoria-1', ativo: false })

        const service = new DeleteCategoriaService()
        await service.execute('categoria-1', empresaId)

        expect(prismaMock.categoria.update).toHaveBeenCalledWith({
            where: { id: 'categoria-1' },
            data: { ativo: false },
        })
    })
})

describe('GetCategoriaService', () => {
    it('lança 404 quando a categoria não existe, não é da empresa ou está inativa', async () => {
        prismaMock.categoria.findFirst.mockResolvedValue(null)

        const service = new GetCategoriaService()

        await expect(service.execute('categoria-1', empresaId)).rejects.toMatchObject({ statusCode: 404 })
    })

    it('retorna a categoria com a contagem de produtos ativos', async () => {
        const categoria = { id: 'categoria-1', nome: 'Bebidas', _count: { produtos: 3 } }
        prismaMock.categoria.findFirst.mockResolvedValue(categoria)

        const service = new GetCategoriaService()
        const resultado = await service.execute('categoria-1', empresaId)

        expect(resultado).toEqual(categoria)
    })
})

describe('ListCategoriaService', () => {
    it('lança 404 quando a empresa não existe ou está inativa', async () => {
        prismaMock.empresa.findFirst.mockResolvedValue(null)

        const service = new ListCategoriaService()

        await expect(service.execute(empresaId)).rejects.toMatchObject({ statusCode: 404 })
        expect(prismaMock.categoria.findMany).not.toHaveBeenCalled()
    })

    it('lista as categorias ativas da empresa, sem filtro de nome', async () => {
        prismaMock.empresa.findFirst.mockResolvedValue({ id: empresaId, ativo: true })
        prismaMock.categoria.findMany.mockResolvedValue([{ id: 'categoria-1', nome: 'Bebidas' }])

        const service = new ListCategoriaService()
        const resultado = await service.execute(empresaId)

        expect(resultado).toEqual([{ id: 'categoria-1', nome: 'Bebidas' }])
        expect(prismaMock.categoria.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { empresaId, ativo: true } })
        )
    })

    it('filtra por nome (case-insensitive) quando informado', async () => {
        prismaMock.empresa.findFirst.mockResolvedValue({ id: empresaId, ativo: true })
        prismaMock.categoria.findMany.mockResolvedValue([])

        const service = new ListCategoriaService()
        await service.execute(empresaId, { nome: 'beb' })

        expect(prismaMock.categoria.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    empresaId,
                    ativo: true,
                    nome: { contains: 'beb', mode: 'insensitive' },
                },
            })
        )
    })
})
