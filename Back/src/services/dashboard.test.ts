import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const prismaMock = {
    $queryRaw: vi.fn(),
    produto: {
        findMany: vi.fn(),
    },
}

vi.mock('../conf/prisma.js', () => ({
    default: prismaMock,
}))

const { GetResumoEstoqueService } = await import('./dashboard.js')

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
