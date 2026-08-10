import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const prismaMock = {
    $queryRaw: vi.fn(),
    produto: {
        findMany: vi.fn(),
    },
    itemVenda: {
        groupBy: vi.fn(),
        findMany: vi.fn(),
    },
    venda: {
        aggregate: vi.fn(),
    },
    pagamentoFiado: {
        aggregate: vi.fn(),
    },
}

vi.mock('../conf/prisma.js', () => ({
    default: prismaMock,
}))

const {
    GetResumoEstoqueService,
    GetVendasResumoService,
    GetVendasPorDiaService,
    GetProdutosMaisVendidosService,
    GetFiadoResumoService,
} = await import('./dashboard.js')

const empresaId = 'empresa-1'

beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-08T12:00:00Z'))
})

afterEach(() => {
    vi.useRealTimers()
})

describe('GetResumoEstoqueService', () => {
    it('retorna os totais agregados vindos do SQL (contagem e soma de valor em estoque)', async () => {
        prismaMock.$queryRaw.mockResolvedValue([{ totalProdutos: 3n, valorCusto: '150', valorVenda: '370' }])
        prismaMock.produto.findMany.mockResolvedValue([])

        const service = new GetResumoEstoqueService()
        const resultado = await service.execute(empresaId)

        expect(resultado.totalProdutos).toBe(3)
        expect(resultado.valorCusto).toBe(150)
        expect(resultado.valorVenda).toBe(370)
    })

    it('busca a tendência só entre produtos ativos da própria empresa', async () => {
        prismaMock.$queryRaw.mockResolvedValue([{ totalProdutos: 0n, valorCusto: '0', valorVenda: '0' }])
        prismaMock.produto.findMany.mockResolvedValue([])

        const service = new GetResumoEstoqueService()
        await service.execute(empresaId)

        expect(prismaMock.produto.findMany).toHaveBeenCalledWith({
            where: { empresaId, ativo: true },
            select: { criadoEm: true },
        })
    })

    it('tendenciaProdutos: monta 7 dias (hoje incluso) com contagem cumulativa por criadoEm', async () => {
        prismaMock.$queryRaw.mockResolvedValue([{ totalProdutos: 2n, valorCusto: '0', valorVenda: '0' }])
        prismaMock.produto.findMany.mockResolvedValue([
            { criadoEm: new Date('2026-08-03T10:00:00Z') },
            { criadoEm: new Date('2026-08-08T09:00:00Z') }, // "hoje", segundo produto
        ])

        const service = new GetResumoEstoqueService()
        const resultado = await service.execute(empresaId)

        expect(resultado.tendenciaProdutos).toHaveLength(7)
        // Janela: 02/08 (sem produtos ainda) até 08/08 (hoje, com os dois já criados).
        expect(resultado.tendenciaProdutos[0]).toEqual({ data: '2026-08-02', total: 0 })
        expect(resultado.tendenciaProdutos.find((dia) => dia.data === '2026-08-03')).toEqual({
            data: '2026-08-03',
            total: 1,
        })
        expect(resultado.tendenciaProdutos.at(-1)).toEqual({ data: '2026-08-08', total: 2 })
    })

    it('tendenciaProdutos: fica zerada em todos os dias quando a empresa não tem produtos ativos', async () => {
        prismaMock.$queryRaw.mockResolvedValue([{ totalProdutos: 0n, valorCusto: '0', valorVenda: '0' }])
        prismaMock.produto.findMany.mockResolvedValue([])

        const service = new GetResumoEstoqueService()
        const resultado = await service.execute(empresaId)

        expect(resultado.tendenciaProdutos.every((dia) => dia.total === 0)).toBe(true)
    })
})

describe('GetVendasResumoService', () => {
    it('retorna faturamento e quantidade de vendas de hoje a partir do SQL', async () => {
        prismaMock.$queryRaw
            .mockResolvedValueOnce([{ quantidadeVendas: 3n, faturamento: '150.00' }])
            .mockResolvedValueOnce([])

        const service = new GetVendasResumoService()
        const resultado = await service.execute(empresaId)

        expect(resultado.faturamentoHoje).toBe(150)
        expect(resultado.quantidadeVendasHoje).toBe(3)
    })

    it('fica zerado quando a empresa ainda não vendeu nada', async () => {
        prismaMock.$queryRaw
            .mockResolvedValueOnce([{ quantidadeVendas: 0n, faturamento: null }])
            .mockResolvedValueOnce([])

        const service = new GetVendasResumoService()
        const resultado = await service.execute(empresaId)

        expect(resultado.faturamentoHoje).toBe(0)
        expect(resultado.quantidadeVendasHoje).toBe(0)
    })

    it('tendenciaFaturamento: monta 7 dias (hoje incluso), zerando os dias sem venda', async () => {
        prismaMock.$queryRaw
            .mockResolvedValueOnce([{ quantidadeVendas: 1n, faturamento: '42.50' }])
            .mockResolvedValueOnce([{ dia: new Date('2026-08-08T00:00:00Z'), total: '42.50' }])

        const service = new GetVendasResumoService()
        const resultado = await service.execute(empresaId)

        expect(resultado.tendenciaFaturamento).toHaveLength(7)
        // Janela: 02/08 (sem vendas ainda) até 08/08 (hoje, com a venda de R$42,50).
        expect(resultado.tendenciaFaturamento[0]).toEqual({ data: '2026-08-02', total: 0 })
        expect(resultado.tendenciaFaturamento.at(-1)).toEqual({ data: '2026-08-08', total: 42.5 })
    })
})

describe('GetVendasPorDiaService', () => {
    it('preenche os dias sem venda com zero', async () => {
        prismaMock.$queryRaw.mockResolvedValue([
            { dia: new Date('2026-08-08T00:00:00Z'), total: '100', quantidade: 2n },
        ])

        const service = new GetVendasPorDiaService()
        const resultado = await service.execute(empresaId, 7)

        expect(resultado).toHaveLength(7)
        expect(resultado.at(-1)).toEqual({ data: '2026-08-08', total: 100, quantidade: 2 })
        expect(resultado[0]).toEqual({ data: '2026-08-02', total: 0, quantidade: 0 })
    })

    it('limita a janela pedida a no máximo 90 dias', async () => {
        prismaMock.$queryRaw.mockResolvedValue([])

        const service = new GetVendasPorDiaService()
        const resultado = await service.execute(empresaId, 400)

        expect(resultado).toHaveLength(90)
    })
})

describe('GetProdutosMaisVendidosService', () => {
    it('retorna vazio quando não há vendas no período, sem consultar produtos', async () => {
        prismaMock.itemVenda.groupBy.mockResolvedValue([])

        const service = new GetProdutosMaisVendidosService()
        const resultado = await service.execute(empresaId)

        expect(resultado).toEqual([])
        expect(prismaMock.produto.findMany).not.toHaveBeenCalled()
    })

    it('combina a soma de quantidade (groupBy) com nome do produto e faturamento somado a partir dos itens', async () => {
        prismaMock.itemVenda.groupBy.mockResolvedValue([{ produtoId: 'produto-1', _sum: { quantidade: 10 } }])
        prismaMock.produto.findMany.mockResolvedValue([
            { id: 'produto-1', nome: 'Refrigerante 2L', unidadeMedida: 'UN' },
        ])
        prismaMock.itemVenda.findMany.mockResolvedValue([
            { produtoId: 'produto-1', quantidade: 6, precoUnitario: 8.5 },
            { produtoId: 'produto-1', quantidade: 4, precoUnitario: 8.5 },
        ])

        const service = new GetProdutosMaisVendidosService()
        const resultado = await service.execute(empresaId)

        expect(resultado).toEqual([
            {
                produtoId: 'produto-1',
                nome: 'Refrigerante 2L',
                unidadeMedida: 'UN',
                quantidadeVendida: 10,
                faturamento: 85,
            },
        ])
        expect(prismaMock.itemVenda.groupBy).toHaveBeenCalledWith(
            expect.objectContaining({
                by: ['produtoId'],
                orderBy: { _sum: { quantidade: 'desc' } },
            })
        )
    })
})

describe('GetFiadoResumoService', () => {
    it('retorna o total a receber (soma de vendas fiado menos soma de pagamentos) da empresa', async () => {
        prismaMock.venda.aggregate.mockResolvedValue({ _sum: { total: 500 } })
        prismaMock.pagamentoFiado.aggregate.mockResolvedValue({ _sum: { valor: 120 } })

        const service = new GetFiadoResumoService()
        const resultado = await service.execute(empresaId)

        expect(resultado.totalReceber).toBe(380)
        expect(prismaMock.venda.aggregate).toHaveBeenCalledWith({
            where: { empresaId, formaPagamento: 'FIADO' },
            _sum: { total: true },
        })
    })

    it('fica em zero quando a empresa nunca vendeu fiado', async () => {
        prismaMock.venda.aggregate.mockResolvedValue({ _sum: { total: null } })
        prismaMock.pagamentoFiado.aggregate.mockResolvedValue({ _sum: { valor: null } })

        const service = new GetFiadoResumoService()
        const resultado = await service.execute(empresaId)

        expect(resultado.totalReceber).toBe(0)
    })
})
