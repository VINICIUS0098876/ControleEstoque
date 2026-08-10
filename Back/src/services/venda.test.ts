import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'

const prismaMock = {
    produto: {
        findMany: vi.fn(),
        update: vi.fn(),
    },
    movimentacao: {
        create: vi.fn(),
    },
    venda: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
    },
    cliente: {
        findFirst: vi.fn(),
    },
    pagamentoFiado: {
        groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
}

vi.mock('../conf/prisma.js', () => ({
    default: prismaMock,
}))

const { CreateVendaService, ListVendaService, GetVendaService } = await import('./venda.js')

const empresaId = 'empresa-1'
const usuarioId = 'usuario-1'

function criarProduto(overrides: Record<string, unknown> = {}) {
    return {
        id: 'produto-1',
        nome: 'Refrigerante 2L',
        empresaId,
        ativo: true,
        quantidadeAtual: 10,
        precoVenda: 8.5,
        ...overrides,
    }
}

beforeEach(() => {
    vi.clearAllMocks()
    // Cobre as duas formas de $transaction usadas pelo service: callback (interactive
    // transaction, usada por CreateVendaService) e array (usada por ListVendaService). O
    // "tx" de uma interactive transaction expõe a mesma API do client principal, então
    // reusar o prismaMock como tx é equivalente pro que os testes verificam (mesmo padrão
    // de empresa.test.ts).
    prismaMock.$transaction.mockImplementation((arg: unknown) => {
        if (typeof arg === 'function') return (arg as (tx: typeof prismaMock) => unknown)(prismaMock)
        return Promise.all(arg as Promise<unknown>[])
    })
})

describe('CreateVendaService', () => {
    it('lança 400 quando o carrinho está vazio', async () => {
        const service = new CreateVendaService()

        await expect(
            service.execute({ formaPagamento: 'DINHEIRO', itens: [], empresaId, usuarioId })
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(prismaMock.produto.findMany).not.toHaveBeenCalled()
    })

    it('lança 404 quando um dos produtos do carrinho não existe (ou não é da empresa/está inativo)', async () => {
        prismaMock.produto.findMany.mockResolvedValue([criarProduto()])

        const service = new CreateVendaService()

        await expect(
            service.execute({
                formaPagamento: 'DINHEIRO',
                itens: [
                    { produtoId: 'produto-1', quantidade: 1 },
                    { produtoId: 'produto-inexistente', quantidade: 1 },
                ],
                empresaId,
                usuarioId,
            })
        ).rejects.toMatchObject({ statusCode: 404 })
        expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })

    it('lança 400 com o nome do produto quando o estoque é insuficiente', async () => {
        prismaMock.produto.findMany.mockResolvedValue([criarProduto({ quantidadeAtual: 2 })])

        const service = new CreateVendaService()

        await expect(
            service.execute({
                formaPagamento: 'PIX',
                itens: [{ produtoId: 'produto-1', quantidade: 5 }],
                empresaId,
                usuarioId,
            })
        ).rejects.toMatchObject({
            statusCode: 400,
            message: expect.stringContaining('Refrigerante 2L'),
        })
        expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })

    it('agrupa linhas duplicadas do mesmo produto antes de checar estoque (soma as quantidades)', async () => {
        prismaMock.produto.findMany.mockResolvedValue([criarProduto({ quantidadeAtual: 5 })])
        prismaMock.produto.update.mockResolvedValue({ id: 'produto-1' })
        prismaMock.movimentacao.create.mockResolvedValue({ id: 'mov-1' })
        prismaMock.venda.create.mockResolvedValue({ id: 'venda-1', total: '25.50' })

        const service = new CreateVendaService()

        // Duas linhas de 3 cada: estoque real (5) não cobriria 3+3=6, então isso só passa
        // se o serviço agrupar antes de checar (senão cada linha isolada, 3 <= 5, passaria
        // incorretamente).
        await expect(
            service.execute({
                formaPagamento: 'DINHEIRO',
                itens: [
                    { produtoId: 'produto-1', quantidade: 3 },
                    { produtoId: 'produto-1', quantidade: 3 },
                ],
                empresaId,
                usuarioId,
            })
        ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('busca cada produto uma única vez (findMany com ids únicos) mesmo com produto duplicado no carrinho', async () => {
        prismaMock.produto.findMany.mockResolvedValue([criarProduto({ quantidadeAtual: 10 })])
        prismaMock.produto.update.mockResolvedValue({ id: 'produto-1' })
        prismaMock.movimentacao.create.mockResolvedValue({ id: 'mov-1' })
        prismaMock.venda.create.mockResolvedValue({ id: 'venda-1' })

        const service = new CreateVendaService()
        await service.execute({
            formaPagamento: 'DINHEIRO',
            itens: [
                { produtoId: 'produto-1', quantidade: 2 },
                { produtoId: 'produto-1', quantidade: 1 },
            ],
            empresaId,
            usuarioId,
        })

        expect(prismaMock.produto.findMany).toHaveBeenCalledWith({
            where: { id: { in: ['produto-1'] }, empresaId, ativo: true },
        })
        // Uma única baixa de estoque, já com as quantidades somadas (3), não duas de 2 e 1.
        expect(prismaMock.produto.update).toHaveBeenCalledTimes(1)
        expect(prismaMock.produto.update).toHaveBeenCalledWith({
            where: { id: 'produto-1', empresaId, ativo: true, quantidadeAtual: { gte: 3 } },
            data: { quantidadeAtual: { decrement: 3 } },
        })
    })

    it('usa sempre o preço de venda atual do produto (nunca um valor vindo do payload) e soma o total corretamente', async () => {
        prismaMock.produto.findMany.mockResolvedValue([
            criarProduto({ id: 'produto-1', precoVenda: 8.5, quantidadeAtual: 10 }),
            criarProduto({ id: 'produto-2', nome: 'Água 500ml', precoVenda: 3, quantidadeAtual: 10 }),
        ])
        prismaMock.produto.update.mockResolvedValue({})
        prismaMock.movimentacao.create.mockResolvedValue({})
        prismaMock.venda.create.mockResolvedValue({ id: 'venda-1' })

        const service = new CreateVendaService()
        await service.execute({
            formaPagamento: 'CARTAO',
            itens: [
                { produtoId: 'produto-1', quantidade: 2 }, // 2 * 8.5 = 17
                { produtoId: 'produto-2', quantidade: 3 }, // 3 * 3 = 9
            ],
            empresaId,
            usuarioId,
        })

        expect(prismaMock.venda.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    formaPagamento: 'CARTAO',
                    total: 26,
                    empresaId,
                    usuarioId,
                    itens: {
                        create: [
                            { produtoId: 'produto-1', quantidade: 2, precoUnitario: 8.5 },
                            { produtoId: 'produto-2', quantidade: 3, precoUnitario: 3 },
                        ],
                    },
                }),
            })
        )
    })

    it('registra uma Movimentacao tipo SAIDA por produto, atribuída ao usuário que vendeu', async () => {
        prismaMock.produto.findMany.mockResolvedValue([criarProduto({ quantidadeAtual: 10 })])
        prismaMock.produto.update.mockResolvedValue({})
        prismaMock.movimentacao.create.mockResolvedValue({})
        prismaMock.venda.create.mockResolvedValue({ id: 'venda-1' })

        const service = new CreateVendaService()
        await service.execute({
            formaPagamento: 'DINHEIRO',
            itens: [{ produtoId: 'produto-1', quantidade: 4 }],
            empresaId,
            usuarioId,
        })

        expect(prismaMock.movimentacao.create).toHaveBeenCalledWith({
            data: {
                tipo: 'SAIDA',
                quantidade: 4,
                motivo: 'Venda PDV',
                produtoId: 'produto-1',
                empresaId,
                usuarioId,
            },
        })
    })

    it('traduz P2025 (estoque mudou entre a checagem otimista e a transação) em 409', async () => {
        prismaMock.produto.findMany.mockResolvedValue([criarProduto({ quantidadeAtual: 10 })])
        prismaMock.produto.update.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('Record to update not found.', {
                code: 'P2025',
                clientVersion: '7.9.1',
            })
        )

        const service = new CreateVendaService()

        await expect(
            service.execute({
                formaPagamento: 'DINHEIRO',
                itens: [{ produtoId: 'produto-1', quantidade: 4 }],
                empresaId,
                usuarioId,
            })
        ).rejects.toMatchObject({ statusCode: 409 })
    })

    it('repropaga erros inesperados sem mascará-los como conflito de estoque', async () => {
        prismaMock.produto.findMany.mockResolvedValue([criarProduto({ quantidadeAtual: 10 })])
        prismaMock.produto.update.mockRejectedValue(new Error('conexão perdida'))

        const service = new CreateVendaService()

        await expect(
            service.execute({
                formaPagamento: 'DINHEIRO',
                itens: [{ produtoId: 'produto-1', quantidade: 1 }],
                empresaId,
                usuarioId,
            })
        ).rejects.toThrow('conexão perdida')
    })
})

describe('CreateVendaService — FIADO', () => {
    it('lança 400 quando FIADO é escolhido sem clienteId (defesa em profundidade, além do schema)', async () => {
        prismaMock.produto.findMany.mockResolvedValue([criarProduto({ quantidadeAtual: 10 })])

        const service = new CreateVendaService()

        await expect(
            service.execute({
                formaPagamento: 'FIADO',
                itens: [{ produtoId: 'produto-1', quantidade: 1 }],
                empresaId,
                usuarioId,
            })
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(prismaMock.cliente.findFirst).not.toHaveBeenCalled()
    })

    it('lança 404 quando o cliente não existe (ou não é da empresa/está inativo)', async () => {
        prismaMock.produto.findMany.mockResolvedValue([criarProduto({ quantidadeAtual: 10 })])
        prismaMock.cliente.findFirst.mockResolvedValue(null)

        const service = new CreateVendaService()

        await expect(
            service.execute({
                formaPagamento: 'FIADO',
                clienteId: 'cliente-1',
                itens: [{ produtoId: 'produto-1', quantidade: 1 }],
                empresaId,
                usuarioId,
            })
        ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('permite venda fiado sem checar limite quando o cliente não tem limite definido', async () => {
        prismaMock.produto.findMany.mockResolvedValue([criarProduto({ precoVenda: 100, quantidadeAtual: 10 })])
        prismaMock.cliente.findFirst.mockResolvedValue({
            id: 'cliente-1',
            nome: 'Maria',
            empresaId,
            ativo: true,
            limiteCredito: null,
        })
        prismaMock.produto.update.mockResolvedValue({})
        prismaMock.movimentacao.create.mockResolvedValue({})
        prismaMock.venda.create.mockResolvedValue({ id: 'venda-1' })

        const service = new CreateVendaService()
        await service.execute({
            formaPagamento: 'FIADO',
            clienteId: 'cliente-1',
            itens: [{ produtoId: 'produto-1', quantidade: 5 }], // total 500 — sem limite, não importa
            empresaId,
            usuarioId,
        })

        expect(prismaMock.venda.groupBy).not.toHaveBeenCalled()
        expect(prismaMock.venda.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ clienteId: 'cliente-1', formaPagamento: 'FIADO' }),
            })
        )
    })

    it('lança 400 quando a venda ultrapassaria o limite de crédito do cliente', async () => {
        prismaMock.produto.findMany.mockResolvedValue([criarProduto({ precoVenda: 100, quantidadeAtual: 10 })])
        prismaMock.cliente.findFirst.mockResolvedValue({
            id: 'cliente-1',
            nome: 'Maria',
            empresaId,
            ativo: true,
            limiteCredito: 150,
        })
        prismaMock.venda.groupBy.mockResolvedValue([{ clienteId: 'cliente-1', _sum: { total: 100 } }])
        prismaMock.pagamentoFiado.groupBy.mockResolvedValue([])

        const service = new CreateVendaService()

        // saldo atual 100 + esta venda de 100 (1 unidade a 100) = 200 > limite 150.
        await expect(
            service.execute({
                formaPagamento: 'FIADO',
                clienteId: 'cliente-1',
                itens: [{ produtoId: 'produto-1', quantidade: 1 }],
                empresaId,
                usuarioId,
            })
        ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('Maria') })
        expect(prismaMock.venda.create).not.toHaveBeenCalled()
    })

    it('permite a venda fiado quando o saldo somado ainda cabe exatamente no limite', async () => {
        prismaMock.produto.findMany.mockResolvedValue([criarProduto({ precoVenda: 50, quantidadeAtual: 10 })])
        prismaMock.cliente.findFirst.mockResolvedValue({
            id: 'cliente-1',
            nome: 'Maria',
            empresaId,
            ativo: true,
            limiteCredito: 150,
        })
        prismaMock.venda.groupBy.mockResolvedValue([{ clienteId: 'cliente-1', _sum: { total: 100 } }])
        prismaMock.pagamentoFiado.groupBy.mockResolvedValue([])
        prismaMock.produto.update.mockResolvedValue({})
        prismaMock.movimentacao.create.mockResolvedValue({})
        prismaMock.venda.create.mockResolvedValue({ id: 'venda-1' })

        const service = new CreateVendaService()

        // saldo atual 100 + esta venda de 50 = 150, exatamente no limite (não ultrapassa).
        await service.execute({
            formaPagamento: 'FIADO',
            clienteId: 'cliente-1',
            itens: [{ produtoId: 'produto-1', quantidade: 1 }],
            empresaId,
            usuarioId,
        })

        expect(prismaMock.venda.create).toHaveBeenCalled()
    })
})

describe('ListVendaService', () => {
    it('lista as vendas da empresa paginadas, mais recentes primeiro', async () => {
        prismaMock.venda.findMany.mockResolvedValue([{ id: 'venda-1' }])
        prismaMock.venda.count.mockResolvedValue(1)

        const service = new ListVendaService()
        const resultado = await service.execute(empresaId, { page: 1, limit: 20 })

        expect(resultado).toEqual({ vendas: [{ id: 'venda-1' }], total: 1, page: 1, limit: 20, totalPages: 1 })
        expect(prismaMock.venda.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { empresaId },
                orderBy: { criadoEm: 'desc' },
                skip: 0,
                take: 20,
            })
        )
    })
})

describe('GetVendaService', () => {
    it('lança 404 quando a venda não existe (ou não é da empresa)', async () => {
        prismaMock.venda.findFirst.mockResolvedValue(null)

        const service = new GetVendaService()

        await expect(service.execute('venda-1', empresaId)).rejects.toMatchObject({ statusCode: 404 })
    })

    it('retorna a venda com os itens e o nome de quem vendeu', async () => {
        const venda = { id: 'venda-1', empresaId, itens: [] }
        prismaMock.venda.findFirst.mockResolvedValue(venda)

        const service = new GetVendaService()
        const resultado = await service.execute('venda-1', empresaId)

        expect(resultado).toEqual(venda)
        expect(prismaMock.venda.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'venda-1', empresaId } })
        )
    })
})
