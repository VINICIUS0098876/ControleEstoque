import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMock = {
    categoria: {
        findFirst: vi.fn(),
    },
    produto: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
}

vi.mock('../conf/prisma.js', () => ({
    default: prismaMock,
}))

const { CreateProdutoService, UpdateProdutoService, DeleteProdutoService, ListProdutoService } = await import(
    './produto.js'
)

const empresaId = 'empresa-1'

function criarPayload(overrides: Record<string, unknown> = {}) {
    return {
        nome: 'Camiseta preta M',
        precoCusto: 20,
        precoVenda: 50,
        empresaId,
        ...overrides,
    }
}

beforeEach(() => {
    vi.clearAllMocks()
    // $transaction em array-form (caminho padrão de ListProdutoService, fora do
    // filtro estoqueBaixo) só resolve as promises já criadas pelas chamadas passadas a ele.
    prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))
})

describe('CreateProdutoService', () => {
    it('lança 400 quando a categoria informada não existe (ou não é da empresa)', async () => {
        prismaMock.categoria.findFirst.mockResolvedValue(null)

        const service = new CreateProdutoService()

        await expect(
            service.execute(criarPayload({ categoriaId: 'categoria-x' }))
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(prismaMock.produto.create).not.toHaveBeenCalled()
    })

    it('lança 409 quando já existe produto ativo com o mesmo SKU na empresa', async () => {
        prismaMock.produto.findFirst.mockResolvedValueOnce({ id: 'outro-produto', sku: 'CAM-M' })

        const service = new CreateProdutoService()

        await expect(
            service.execute(criarPayload({ sku: 'CAM-M' }))
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(prismaMock.produto.create).not.toHaveBeenCalled()
    })

    it('lança 409 quando já existe produto ativo com o mesmo código de barras na empresa', async () => {
        // 1ª chamada: checagem de SKU (não veio no payload, então nem é feita) — aqui só código de barras.
        prismaMock.produto.findFirst.mockResolvedValueOnce({ id: 'outro-produto', codigoBarras: '789123' })

        const service = new CreateProdutoService()

        await expect(
            service.execute(criarPayload({ codigoBarras: '789123' }))
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(prismaMock.produto.create).not.toHaveBeenCalled()
    })

    it('cria o produto com os defaults corretos quando os dados são válidos', async () => {
        prismaMock.produto.create.mockResolvedValue({ id: 'produto-novo' })

        const service = new CreateProdutoService()
        await service.execute(criarPayload())

        expect(prismaMock.produto.create).toHaveBeenCalledWith({
            data: {
                nome: 'Camiseta preta M',
                codigoBarras: null,
                sku: null,
                descricao: null,
                unidadeMedida: 'UN',
                precoCusto: 20,
                precoVenda: 50,
                quantidadeAtual: 0,
                estoqueMinimo: 5,
                imagemUrl: null,
                categoriaId: null,
                empresaId,
            },
        })
    })
})

describe('UpdateProdutoService', () => {
    function criarProdutoExistente(overrides: Record<string, unknown> = {}) {
        return {
            id: 'produto-1',
            empresaId,
            ativo: true,
            codigoBarras: null,
            sku: 'SKU-ANTIGO',
            descricao: null,
            unidadeMedida: 'UN',
            quantidadeAtual: 42,
            estoqueMinimo: 5,
            imagemUrl: null,
            categoriaId: null,
            ...overrides,
        }
    }

    it('lança 404 quando o produto não existe (ou não pertence à empresa)', async () => {
        prismaMock.produto.findFirst.mockResolvedValueOnce(null)

        const service = new UpdateProdutoService()

        await expect(
            service.execute('produto-1', criarPayload())
        ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('permite manter o próprio SKU do produto ao editar (não conflita consigo mesmo)', async () => {
        const existente = criarProdutoExistente({ sku: 'SKU-ATUAL' })
        prismaMock.produto.findFirst
            .mockResolvedValueOnce(existente) // busca do produto
            .mockResolvedValueOnce(existente) // checagem de SKU duplicado -> é o próprio produto
        prismaMock.produto.update.mockResolvedValue({ ...existente })

        const service = new UpdateProdutoService()
        await service.execute('produto-1', criarPayload({ sku: 'SKU-ATUAL' }))

        expect(prismaMock.produto.update).toHaveBeenCalled()
    })

    it('lança 409 quando o SKU já pertence a outro produto ativo', async () => {
        const existente = criarProdutoExistente()
        prismaMock.produto.findFirst
            .mockResolvedValueOnce(existente)
            .mockResolvedValueOnce({ id: 'produto-diferente', sku: 'SKU-CONFLITO' })

        const service = new UpdateProdutoService()

        await expect(
            service.execute('produto-1', criarPayload({ sku: 'SKU-CONFLITO' }))
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(prismaMock.produto.update).not.toHaveBeenCalled()
    })

    it('nunca escreve quantidadeAtual — mantém o valor já existente no produto', async () => {
        const existente = criarProdutoExistente({ quantidadeAtual: 42 })
        prismaMock.produto.findFirst.mockResolvedValueOnce(existente)
        prismaMock.produto.update.mockResolvedValue({ ...existente })

        const service = new UpdateProdutoService()
        await service.execute('produto-1', criarPayload())

        expect(prismaMock.produto.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ quantidadeAtual: 42 }),
            })
        )
    })
})

describe('DeleteProdutoService', () => {
    it('ao inativar, zera sku e codigoBarras para liberar o identificador (constraint UNIQUE é só entre ativos)', async () => {
        prismaMock.produto.findFirst.mockResolvedValueOnce({
            id: 'produto-1',
            empresaId,
            ativo: true,
        })
        prismaMock.produto.update.mockResolvedValue({ id: 'produto-1', nome: 'Produto X' })

        const service = new DeleteProdutoService()
        await service.execute('produto-1', empresaId)

        expect(prismaMock.produto.update).toHaveBeenCalledWith({
            where: { id: 'produto-1' },
            data: { ativo: false, sku: null, codigoBarras: null },
            select: { id: true, nome: true },
        })
    })
})

describe('ListProdutoService — filtro estoqueBaixo', () => {
    it('busca os ids via SQL paginado e reordena o findMany conforme essa ordem', async () => {
        // 1ª chamada a $queryRaw: lista de ids (já paginada/ordenada por nome). 2ª: contagem total.
        prismaMock.$queryRaw
            .mockResolvedValueOnce([{ id: 'p2' }, { id: 'p1' }])
            .mockResolvedValueOnce([{ total: 2n }])

        // findMany devolve fora de ordem de propósito, pra provar que o serviço reordena.
        prismaMock.produto.findMany.mockResolvedValue([
            { id: 'p1', nome: 'Produto A', quantidadeAtual: 1, estoqueMinimo: 5, categoria: null },
            { id: 'p2', nome: 'Produto B', quantidadeAtual: 0, estoqueMinimo: 3, categoria: null },
        ])

        const service = new ListProdutoService()
        const resultado = await service.execute(empresaId, { estoqueBaixo: true, page: 1, limit: 10 })

        expect(resultado.total).toBe(2)
        expect(resultado.produtos.map((p) => p.id)).toEqual(['p2', 'p1'])
        expect(prismaMock.produto.findMany).toHaveBeenCalledWith({
            where: { id: { in: ['p2', 'p1'] } },
            include: {
                categoria: { select: { nome: true } },
                _count: { select: { movimentacoes: true } },
            },
        })
    })
})

describe('ListProdutoService — filtro busca', () => {
    it('busca por nome, SKU ou código de barras (OR) — necessário pro PDV achar produto por código escaneado', async () => {
        prismaMock.produto.findMany.mockResolvedValue([])
        prismaMock.produto.count.mockResolvedValue(0)

        const service = new ListProdutoService()
        await service.execute(empresaId, { busca: '789123' })

        expect(prismaMock.produto.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    empresaId,
                    ativo: true,
                    OR: [
                        { nome: { contains: '789123', mode: 'insensitive' } },
                        { sku: { contains: '789123', mode: 'insensitive' } },
                        { codigoBarras: { contains: '789123', mode: 'insensitive' } },
                    ],
                },
            })
        )
    })
})
