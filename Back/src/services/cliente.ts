import prismaClient from '../conf/prisma.js'
import { AppError } from '../utils/AppError.js'
import { ERROR_NOT_FOUND } from '../utils/messages.js'

interface Cliente{
    nome: string;
    telefone?: string;
    limiteCredito?: number;
    empresaId: string;
}

// Saldo devedor de fiado não é uma coluna própria: é sempre recalculado a partir do
// histórico (ver comentário no model PagamentoFiado) — SUM(vendas fiado) - SUM(pagamentos).
// Duas agregações agrupadas por clienteId (em vez de uma consulta por cliente) cobrem
// qualquer quantidade de clientes de uma vez; usado tanto pela listagem/detalhe de
// cliente aqui quanto pela checagem de limite de crédito em CreateVendaService.
export async function calcularSaldosDevedores(clienteIds: string[]): Promise<Map<string, number>> {
    if(clienteIds.length === 0) return new Map()

    const [fiadoPorCliente, pagamentosPorCliente] = await Promise.all([
        prismaClient.venda.groupBy({
            by: ['clienteId'],
            where: { clienteId: { in: clienteIds }, formaPagamento: 'FIADO' },
            _sum: { total: true }
        }),
        prismaClient.pagamentoFiado.groupBy({
            by: ['clienteId'],
            where: { clienteId: { in: clienteIds } },
            _sum: { valor: true }
        })
    ])

    const saldos = new Map<string, number>()
    for(const linha of fiadoPorCliente){
        // clienteId nunca é nulo aqui: o `where` acima já filtra por uma lista de ids
        // conhecidos (não-nulos) — o `!` só resolve o tipo opcional herdado da coluna.
        saldos.set(linha.clienteId!, Number(linha._sum.total ?? 0))
    }
    for(const linha of pagamentosPorCliente){
        const atual = saldos.get(linha.clienteId) ?? 0
        saldos.set(linha.clienteId, atual - Number(linha._sum.valor ?? 0))
    }

    return saldos
}

export class CreateClienteService{
    async execute(data: Cliente){
        const cliente = await prismaClient.cliente.create({
            data: {
                nome: data.nome,
                telefone: data.telefone ?? null,
                limiteCredito: data.limiteCredito ?? null,
                empresaId: data.empresaId
            }
        })

        // Cliente recém-criado nunca tem venda fiado nem pagamento — saldo é sempre 0,
        // sem precisar consultar calcularSaldosDevedores pra isso.
        return { ...cliente, saldoDevedor: 0 }
    }
}

export class UpdateClienteService{
    async execute(id: string, data: Cliente){
        const clienteExistente = await prismaClient.cliente.findFirst({
            where: {
                id: id,
                empresaId: data.empresaId,
                ativo: true
            }
        })

        if(!clienteExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const cliente = await prismaClient.cliente.update({
            where: {
                id: id
            },
            data: {
                nome: data.nome,
                telefone: data.telefone ?? null,
                limiteCredito: data.limiteCredito ?? null,
            }
        })

        return cliente
    }
}

export class DeleteClienteService{
    async execute(id: string, empresaId: string){
        const clienteExistente = await prismaClient.cliente.findFirst({
            where: {
                id: id,
                empresaId: empresaId,
                ativo: true
            }
        })

        if(!clienteExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        // Excluir (soft delete) um cliente com saldo devedor faria o dinheiro em aberto
        // continuar contando no dashboard (GetFiadoResumoService soma direto de Venda/
        // PagamentoFiado, sem olhar Cliente.ativo) sem nenhuma forma de achar o cliente de
        // novo pra cobrar ou registrar o pagamento (GetClienteService/ListClienteService só
        // enxergam clientes ativos) — uma dívida "perdida". Por isso a exclusão é bloqueada
        // enquanto houver saldo devedor, em vez de só avisar e deixar seguir.
        const saldos = await calcularSaldosDevedores([id])
        const saldoDevedor = saldos.get(id) ?? 0

        if(saldoDevedor > 0){
            throw new AppError(
                'Não é possível excluir um cliente com saldo devedor em aberto. Registre o pagamento ou quite a dívida antes.',
                400
            )
        }

        const cliente = await prismaClient.cliente.update({
            where: {
                id: id
            },
            data: {
                ativo: false,
                deletadoEm: new Date()
            },
            select: {
                id: true,
                nome: true
            }
        })

        return cliente
    }
}

export class GetClienteService{
    async execute(id: string, empresaId: string){
        const cliente = await prismaClient.cliente.findFirst({
            where: {
                id: id,
                empresaId: empresaId,
                ativo: true
            }
        })

        if(!cliente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const saldos = await calcularSaldosDevedores([id])

        return { ...cliente, saldoDevedor: saldos.get(id) ?? 0 }
    }
}

type ClienteOrdenavel = 'nome' | 'saldoDevedor'

interface ListClienteFiltros{
    busca?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: ClienteOrdenavel | undefined;
    sortOrder?: 'asc' | 'desc' | undefined;
}

export class ListClienteService{
    async execute(empresaId: string, filtros: ListClienteFiltros = {}){
        const page = filtros.page && filtros.page > 0 ? filtros.page : 1
        const limit = filtros.limit && filtros.limit > 0 ? Math.min(filtros.limit, 100) : 20
        const sortBy: ClienteOrdenavel = filtros.sortBy ?? 'nome'
        const sortOrder: 'asc' | 'desc' = filtros.sortOrder ?? 'asc'

        const where = {
            empresaId: empresaId,
            ativo: true,
            ...(filtros.busca
                ? {
                    OR: [
                        { nome: { contains: filtros.busca, mode: 'insensitive' as const } },
                        { telefone: { contains: filtros.busca, mode: 'insensitive' as const } },
                    ],
                }
                : {}),
        }

        // saldoDevedor não é uma coluna do banco (ver calcularSaldosDevedores) — pra
        // ordenar por ele com paginação correta, calcula o saldo de todos os clientes que
        // batem com o filtro, ordena e pagina em memória, e só então busca os registros
        // completos da página. Mesma ideia do caminho estoqueBaixo em ListProdutoService
        // (ordenar por algo calculado, não uma coluna real), mas em memória em vez de SQL
        // bruto: o volume de clientes de uma empresa (dezenas/centenas) não justifica a
        // complexidade extra de um JOIN agregado só pra isso.
        if(sortBy === 'saldoDevedor'){
            const todosIds = (
                await prismaClient.cliente.findMany({ where, select: { id: true } })
            ).map((cliente) => cliente.id)

            const saldos = await calcularSaldosDevedores(todosIds)
            const idsOrdenados = [...todosIds].sort((a, b) => {
                const diferenca = (saldos.get(a) ?? 0) - (saldos.get(b) ?? 0)
                return sortOrder === 'desc' ? -diferenca : diferenca
            })

            const total = idsOrdenados.length
            const idsDaPagina = idsOrdenados.slice((page - 1) * limit, (page - 1) * limit + limit)

            const clientesSemOrdem = await prismaClient.cliente.findMany({
                where: { id: { in: idsDaPagina } }
            })

            // `findMany` com `id: { in }` não garante preservar a ordem da lista de ids,
            // então a ordem por saldo calculada acima é reaplicada aqui.
            const posicaoPorId = new Map(idsDaPagina.map((id, indice) => [id, indice]))
            const clientes = clientesSemOrdem.sort(
                (a, b) => (posicaoPorId.get(a.id) ?? 0) - (posicaoPorId.get(b.id) ?? 0)
            )

            return {
                clientes: clientes.map((cliente) => ({ ...cliente, saldoDevedor: saldos.get(cliente.id) ?? 0 })),
                total,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(total / limit))
            }
        }

        const [clientes, total] = await prismaClient.$transaction([
            prismaClient.cliente.findMany({
                where,
                orderBy: {
                    nome: sortOrder
                },
                skip: (page - 1) * limit,
                take: limit
            }),
            prismaClient.cliente.count({ where })
        ])

        const saldos = await calcularSaldosDevedores(clientes.map((cliente) => cliente.id))

        return {
            clientes: clientes.map((cliente) => ({
                ...cliente,
                saldoDevedor: saldos.get(cliente.id) ?? 0
            })),
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit))
        }
    }
}
