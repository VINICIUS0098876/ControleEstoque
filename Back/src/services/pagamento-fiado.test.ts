import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMock = {
    cliente: {
        findFirst: vi.fn(),
    },
    pagamentoFiado: {
        create: vi.fn(),
        findMany: vi.fn(),
        groupBy: vi.fn(),
    },
    venda: {
        groupBy: vi.fn(),
    },
}

vi.mock('../conf/prisma.js', () => ({
    default: prismaMock,
}))

const { CreatePagamentoFiadoService, ListPagamentoFiadoService } = await import('./pagamento-fiado.js')

const empresaId = 'empresa-1'
const clienteId = 'cliente-1'
const usuarioId = 'usuario-1'

beforeEach(() => {
    vi.clearAllMocks()
})

describe('CreatePagamentoFiadoService', () => {
    it('lança 404 quando o cliente não existe (ou não é da empresa/está inativo)', async () => {
        prismaMock.cliente.findFirst.mockResolvedValue(null)

        const service = new CreatePagamentoFiadoService()

        await expect(
            service.execute({ valor: 50, clienteId, empresaId, usuarioId })
        ).rejects.toMatchObject({ statusCode: 404 })
        expect(prismaMock.pagamentoFiado.create).not.toHaveBeenCalled()
    })

    it('registra o pagamento e retorna o saldo devedor já atualizado', async () => {
        prismaMock.cliente.findFirst.mockResolvedValue({ id: clienteId, empresaId, ativo: true })
        prismaMock.pagamentoFiado.create.mockResolvedValue({ id: 'pagamento-1', valor: 50, clienteId })
        prismaMock.venda.groupBy.mockResolvedValue([{ clienteId, _sum: { total: 100 } }])
        prismaMock.pagamentoFiado.groupBy.mockResolvedValue([{ clienteId, _sum: { valor: 50 } }])

        const service = new CreatePagamentoFiadoService()
        const resultado = await service.execute({ valor: 50, clienteId, empresaId, usuarioId })

        expect(prismaMock.pagamentoFiado.create).toHaveBeenCalledWith({
            data: { valor: 50, clienteId, empresaId, usuarioId },
        })
        expect(resultado.saldoDevedor).toBe(50)
    })
})

describe('ListPagamentoFiadoService', () => {
    it('lança 404 quando o cliente não existe', async () => {
        prismaMock.cliente.findFirst.mockResolvedValue(null)

        const service = new ListPagamentoFiadoService()

        await expect(service.execute(clienteId, empresaId)).rejects.toMatchObject({ statusCode: 404 })
    })

    it('lista os pagamentos do cliente, mais recentes primeiro', async () => {
        prismaMock.cliente.findFirst.mockResolvedValue({ id: clienteId, empresaId, ativo: true })
        prismaMock.pagamentoFiado.findMany.mockResolvedValue([{ id: 'pagamento-1' }])

        const service = new ListPagamentoFiadoService()
        const resultado = await service.execute(clienteId, empresaId)

        expect(resultado).toEqual([{ id: 'pagamento-1' }])
        expect(prismaMock.pagamentoFiado.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { clienteId, empresaId },
                orderBy: { criadoEm: 'desc' },
            })
        )
    })
})
