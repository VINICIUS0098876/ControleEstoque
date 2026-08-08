import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'

const prismaMock = {
    produto: {
        findFirst: vi.fn(),
        update: vi.fn(),
    },
    movimentacao: {
        create: vi.fn(),
    },
    $transaction: vi.fn(),
}

vi.mock('../conf/prisma.js', () => ({
    default: prismaMock,
}))

const { CreateMovimentacaoService } = await import('./movimentacao.js')

function criarProduto(overrides: Partial<{ quantidadeAtual: number }> = {}) {
    return {
        id: 'produto-1',
        empresaId: 'empresa-1',
        ativo: true,
        quantidadeAtual: 10,
        estoqueMinimo: 5,
        ...overrides,
    }
}

describe('CreateMovimentacaoService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // $transaction em array-form apenas resolve/rejeita as promises já criadas pelas
        // chamadas do Prisma passadas a ele — replica esse comportamento no mock.
        prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))
    })

    it('lança 404 quando o produto não existe (ou não pertence à empresa)', async () => {
        prismaMock.produto.findFirst.mockResolvedValue(null)

        const service = new CreateMovimentacaoService()

        await expect(
            service.execute({ tipo: 'ENTRADA', quantidade: 5, produtoId: 'x', empresaId: 'empresa-1' })
        ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('ENTRADA usa increment atômico, sem filtro de saldo no where', async () => {
        prismaMock.produto.findFirst.mockResolvedValue(criarProduto())
        prismaMock.produto.update.mockResolvedValue({ id: 'produto-1', quantidadeAtual: 15 })
        prismaMock.movimentacao.create.mockResolvedValue({ id: 'mov-1', tipo: 'ENTRADA', quantidade: 5 })

        const service = new CreateMovimentacaoService()
        const resultado = await service.execute({
            tipo: 'ENTRADA',
            quantidade: 5,
            produtoId: 'produto-1',
            empresaId: 'empresa-1',
        })

        expect(resultado).toEqual({ id: 'mov-1', tipo: 'ENTRADA', quantidade: 5 })
        expect(prismaMock.produto.update).toHaveBeenCalledWith({
            where: { id: 'produto-1', empresaId: 'empresa-1', ativo: true },
            data: { quantidadeAtual: { increment: 5 } },
        })
    })

    it('ESTORNO também soma ao estoque (increment), igual a ENTRADA', async () => {
        prismaMock.produto.findFirst.mockResolvedValue(criarProduto())
        prismaMock.produto.update.mockResolvedValue({ id: 'produto-1', quantidadeAtual: 12 })
        prismaMock.movimentacao.create.mockResolvedValue({ id: 'mov-3', tipo: 'ESTORNO', quantidade: 2 })

        const service = new CreateMovimentacaoService()
        await service.execute({ tipo: 'ESTORNO', quantidade: 2, produtoId: 'produto-1', empresaId: 'empresa-1' })

        expect(prismaMock.produto.update).toHaveBeenCalledWith({
            where: { id: 'produto-1', empresaId: 'empresa-1', ativo: true },
            data: { quantidadeAtual: { increment: 2 } },
        })
    })

    it('SAIDA usa decrement atômico com guarda de saldo suficiente no where (não soma em memória)', async () => {
        prismaMock.produto.findFirst.mockResolvedValue(criarProduto({ quantidadeAtual: 10 }))
        prismaMock.produto.update.mockResolvedValue({ id: 'produto-1', quantidadeAtual: 7 })
        prismaMock.movimentacao.create.mockResolvedValue({ id: 'mov-2', tipo: 'SAIDA', quantidade: 3 })

        const service = new CreateMovimentacaoService()
        await service.execute({ tipo: 'SAIDA', quantidade: 3, produtoId: 'produto-1', empresaId: 'empresa-1' })

        expect(prismaMock.produto.update).toHaveBeenCalledWith({
            where: { id: 'produto-1', empresaId: 'empresa-1', ativo: true, quantidadeAtual: { gte: 3 } },
            data: { quantidadeAtual: { decrement: 3 } },
        })
    })

    it('traduz P2025 (guarda de saldo não bateu no update) em "Estoque insuficiente" 400 — cobre a race condition corrigida', async () => {
        prismaMock.produto.findFirst.mockResolvedValue(criarProduto({ quantidadeAtual: 10 }))
        prismaMock.produto.update.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('Record to update not found.', {
                code: 'P2025',
                clientVersion: '7.9.1',
            })
        )

        const service = new CreateMovimentacaoService()

        await expect(
            service.execute({ tipo: 'SAIDA', quantidade: 999, produtoId: 'produto-1', empresaId: 'empresa-1' })
        ).rejects.toMatchObject({ statusCode: 400, message: 'Estoque insuficiente para realizar esta saída.' })
    })

    it('repropaga erros inesperados sem mascará-los como "estoque insuficiente"', async () => {
        prismaMock.produto.findFirst.mockResolvedValue(criarProduto())
        prismaMock.produto.update.mockRejectedValue(new Error('conexão perdida'))

        const service = new CreateMovimentacaoService()

        await expect(
            service.execute({ tipo: 'SAIDA', quantidade: 1, produtoId: 'produto-1', empresaId: 'empresa-1' })
        ).rejects.toThrow('conexão perdida')
    })
})
