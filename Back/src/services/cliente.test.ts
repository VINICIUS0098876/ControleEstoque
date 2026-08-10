import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMock = {
    cliente: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
    },
    venda: {
        groupBy: vi.fn(),
    },
    pagamentoFiado: {
        groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
}

vi.mock('../conf/prisma.js', () => ({
    default: prismaMock,
}))

const {
    CreateClienteService,
    UpdateClienteService,
    DeleteClienteService,
    GetClienteService,
    ListClienteService,
    calcularSaldosDevedores,
} = await import('./cliente.js')

const empresaId = 'empresa-1'

beforeEach(() => {
    vi.clearAllMocks()
    // $transaction em array-form (caminho de ListClienteService) só resolve as promises
    // já criadas pelas chamadas passadas a ele — mesmo padrão dos outros services.
    prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))
})

describe('calcularSaldosDevedores', () => {
    it('retorna mapa vazio sem consultar o banco quando não há ids', async () => {
        const resultado = await calcularSaldosDevedores([])

        expect(resultado.size).toBe(0)
        expect(prismaMock.venda.groupBy).not.toHaveBeenCalled()
        expect(prismaMock.pagamentoFiado.groupBy).not.toHaveBeenCalled()
    })

    it('soma vendas fiado e subtrai pagamentos, por cliente', async () => {
        prismaMock.venda.groupBy.mockResolvedValue([
            { clienteId: 'cliente-1', _sum: { total: 100 } },
            { clienteId: 'cliente-2', _sum: { total: 50 } },
        ])
        prismaMock.pagamentoFiado.groupBy.mockResolvedValue([
            { clienteId: 'cliente-1', _sum: { valor: 30 } },
        ])

        const resultado = await calcularSaldosDevedores(['cliente-1', 'cliente-2'])

        expect(resultado.get('cliente-1')).toBe(70)
        expect(resultado.get('cliente-2')).toBe(50)
    })

    it('cliente só com pagamento (sem venda fiado) fica com saldo negativo — crédito a favor dele', async () => {
        prismaMock.venda.groupBy.mockResolvedValue([])
        prismaMock.pagamentoFiado.groupBy.mockResolvedValue([
            { clienteId: 'cliente-1', _sum: { valor: 20 } },
        ])

        const resultado = await calcularSaldosDevedores(['cliente-1'])

        expect(resultado.get('cliente-1')).toBe(-20)
    })

    it('cliente sem venda fiado nem pagamento não aparece no mapa (tratado como 0 pelos chamadores)', async () => {
        prismaMock.venda.groupBy.mockResolvedValue([])
        prismaMock.pagamentoFiado.groupBy.mockResolvedValue([])

        const resultado = await calcularSaldosDevedores(['cliente-1'])

        expect(resultado.has('cliente-1')).toBe(false)
    })
})

describe('CreateClienteService', () => {
    it('cria o cliente com saldoDevedor 0, sem consultar vendas/pagamentos', async () => {
        prismaMock.cliente.create.mockResolvedValue({
            id: 'cliente-1',
            nome: 'João',
            telefone: null,
            limiteCredito: null,
            empresaId,
        })

        const service = new CreateClienteService()
        const resultado = await service.execute({ nome: 'João', empresaId })

        expect(resultado).toMatchObject({ id: 'cliente-1', saldoDevedor: 0 })
        expect(prismaMock.cliente.create).toHaveBeenCalledWith({
            data: { nome: 'João', telefone: null, limiteCredito: null, empresaId },
        })
        expect(prismaMock.venda.groupBy).not.toHaveBeenCalled()
    })
})

describe('UpdateClienteService', () => {
    it('lança 404 quando o cliente não existe (ou não é da empresa)', async () => {
        prismaMock.cliente.findFirst.mockResolvedValue(null)

        const service = new UpdateClienteService()

        await expect(
            service.execute('cliente-1', { nome: 'João', empresaId })
        ).rejects.toMatchObject({ statusCode: 404 })
        expect(prismaMock.cliente.update).not.toHaveBeenCalled()
    })

    it('atualiza nome, telefone e limite de crédito', async () => {
        prismaMock.cliente.findFirst.mockResolvedValue({ id: 'cliente-1', empresaId, ativo: true })
        prismaMock.cliente.update.mockResolvedValue({ id: 'cliente-1', nome: 'João Silva' })

        const service = new UpdateClienteService()
        await service.execute('cliente-1', {
            nome: 'João Silva',
            telefone: '11999999999',
            limiteCredito: 200,
            empresaId,
        })

        expect(prismaMock.cliente.update).toHaveBeenCalledWith({
            where: { id: 'cliente-1' },
            data: { nome: 'João Silva', telefone: '11999999999', limiteCredito: 200 },
        })
    })
})

describe('DeleteClienteService', () => {
    it('lança 404 quando o cliente não existe (ou já está inativo)', async () => {
        prismaMock.cliente.findFirst.mockResolvedValue(null)

        const service = new DeleteClienteService()

        await expect(service.execute('cliente-1', empresaId)).rejects.toMatchObject({ statusCode: 404 })
        expect(prismaMock.cliente.update).not.toHaveBeenCalled()
    })

    it('desativa (soft delete) o cliente sem saldo devedor', async () => {
        prismaMock.cliente.findFirst.mockResolvedValue({ id: 'cliente-1', empresaId, ativo: true })
        prismaMock.venda.groupBy.mockResolvedValue([])
        prismaMock.pagamentoFiado.groupBy.mockResolvedValue([])
        prismaMock.cliente.update.mockResolvedValue({ id: 'cliente-1', nome: 'João' })

        const service = new DeleteClienteService()
        await service.execute('cliente-1', empresaId)

        expect(prismaMock.cliente.update).toHaveBeenCalledWith({
            where: { id: 'cliente-1' },
            data: { ativo: false, deletadoEm: expect.any(Date) },
            select: { id: true, nome: true },
        })
    })

    it('lança 400 e não exclui quando o cliente tem saldo devedor em aberto', async () => {
        prismaMock.cliente.findFirst.mockResolvedValue({ id: 'cliente-1', empresaId, ativo: true })
        prismaMock.venda.groupBy.mockResolvedValue([{ clienteId: 'cliente-1', _sum: { total: 100 } }])
        prismaMock.pagamentoFiado.groupBy.mockResolvedValue([])

        const service = new DeleteClienteService()

        await expect(service.execute('cliente-1', empresaId)).rejects.toMatchObject({ statusCode: 400 })
        expect(prismaMock.cliente.update).not.toHaveBeenCalled()
    })
})

describe('GetClienteService', () => {
    it('lança 404 quando o cliente não existe', async () => {
        prismaMock.cliente.findFirst.mockResolvedValue(null)

        const service = new GetClienteService()

        await expect(service.execute('cliente-1', empresaId)).rejects.toMatchObject({ statusCode: 404 })
    })

    it('retorna o cliente com o saldo devedor calculado a partir do histórico', async () => {
        prismaMock.cliente.findFirst.mockResolvedValue({ id: 'cliente-1', nome: 'João', empresaId, ativo: true })
        prismaMock.venda.groupBy.mockResolvedValue([{ clienteId: 'cliente-1', _sum: { total: 150 } }])
        prismaMock.pagamentoFiado.groupBy.mockResolvedValue([{ clienteId: 'cliente-1', _sum: { valor: 50 } }])

        const service = new GetClienteService()
        const resultado = await service.execute('cliente-1', empresaId)

        expect(resultado.saldoDevedor).toBe(100)
    })
})

describe('ListClienteService', () => {
    it('lista os clientes paginados com o saldo devedor de cada um, sem uma consulta por cliente', async () => {
        prismaMock.cliente.findMany.mockResolvedValue([
            { id: 'cliente-1', nome: 'Ana' },
            { id: 'cliente-2', nome: 'Bruno' },
        ])
        prismaMock.cliente.count.mockResolvedValue(2)
        prismaMock.venda.groupBy.mockResolvedValue([{ clienteId: 'cliente-1', _sum: { total: 80 } }])
        prismaMock.pagamentoFiado.groupBy.mockResolvedValue([])

        const service = new ListClienteService()
        const resultado = await service.execute(empresaId, { page: 1, limit: 20 })

        expect(resultado.total).toBe(2)
        expect(resultado.clientes.find((c) => c.id === 'cliente-1')?.saldoDevedor).toBe(80)
        expect(resultado.clientes.find((c) => c.id === 'cliente-2')?.saldoDevedor).toBe(0)
        // Uma chamada de groupBy por tabela (batch), não uma por cliente da página.
        expect(prismaMock.venda.groupBy).toHaveBeenCalledTimes(1)
        expect(prismaMock.pagamentoFiado.groupBy).toHaveBeenCalledTimes(1)
    })

    it('ordena por saldo devedor (maior primeiro) e pagina em memória, reordenando o findMany da página', async () => {
        prismaMock.cliente.findMany
            .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }, { id: 'c' }]) // todos os ids do filtro
            .mockResolvedValueOnce([
                // registros completos da página, de propósito fora de ordem — prova que o
                // serviço reordena conforme o saldo, não conforme o retorno do findMany.
                { id: 'c', nome: 'Carla' },
                { id: 'a', nome: 'Ana' },
            ])
        prismaMock.venda.groupBy.mockResolvedValue([
            { clienteId: 'a', _sum: { total: 200 } },
            { clienteId: 'b', _sum: { total: 50 } },
            { clienteId: 'c', _sum: { total: 100 } },
        ])
        prismaMock.pagamentoFiado.groupBy.mockResolvedValue([])

        const service = new ListClienteService()
        const resultado = await service.execute(empresaId, {
            sortBy: 'saldoDevedor',
            sortOrder: 'desc',
            page: 1,
            limit: 2,
        })

        expect(resultado.total).toBe(3)
        expect(resultado.clientes.map((c) => c.id)).toEqual(['a', 'c'])
        expect(resultado.clientes[0]?.saldoDevedor).toBe(200)
        expect(resultado.clientes[1]?.saldoDevedor).toBe(100)
    })

    it('busca por nome ou telefone (OR)', async () => {
        prismaMock.cliente.findMany.mockResolvedValue([])
        prismaMock.cliente.count.mockResolvedValue(0)

        const service = new ListClienteService()
        await service.execute(empresaId, { busca: '11999' })

        expect(prismaMock.cliente.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    empresaId,
                    ativo: true,
                    OR: [
                        { nome: { contains: '11999', mode: 'insensitive' } },
                        { telefone: { contains: '11999', mode: 'insensitive' } },
                    ],
                },
            })
        )
    })
})
