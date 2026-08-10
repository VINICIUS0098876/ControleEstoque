import { Prisma, type FormaPagamento } from '@prisma/client'
import prismaClient from '../conf/prisma.js'
import { AppError } from '../utils/AppError.js'
import { ERROR_NOT_FOUND } from '../utils/messages.js'
import { calcularSaldosDevedores } from './cliente.js'

interface ItemVendaInput{
    produtoId: string;
    quantidade: number;
}

interface CreateVenda{
    formaPagamento: FormaPagamento;
    clienteId?: string;
    itens: ItemVendaInput[];
    empresaId: string;
    usuarioId: string;
}

// Texto fixo, igual ao já sugerido como exemplo no campo "motivo" de uma movimentação
// manual (ver Front/movimentacao-dialog.tsx) — mantém as duas origens de saída de
// estoque (PDV e lançamento manual) reconhecíveis no mesmo histórico.
const MOTIVO_MOVIMENTACAO_VENDA = 'Venda PDV'

const itemVendaComProduto = {
    cliente: {
        select: { nome: true, telefone: true }
    },
    itens: {
        include: {
            produto: {
                select: { nome: true, sku: true, unidadeMedida: true }
            }
        }
    }
} satisfies Prisma.VendaInclude

export class CreateVendaService{
    async execute(data: CreateVenda){
        if(data.itens.length === 0){
            throw new AppError('A venda precisa ter pelo menos um item.', 400)
        }

        // Duas linhas do carrinho para o mesmo produto são somadas antes de qualquer
        // checagem: sem isso, a checagem otimista abaixo compararia cada linha contra o
        // estoque total isoladamente (ex: estoque 5, duas linhas de 3 cada passariam,
        // mesmo a demanda real sendo 6). A garantia definitiva contra concorrência
        // continua sendo o update condicional dentro da transação mais abaixo — isto
        // aqui só evita um erro confuso no caso mais comum (produto duplicado no carrinho).
        const quantidadePorProduto = new Map<string, number>()
        for(const item of data.itens){
            quantidadePorProduto.set(item.produtoId, (quantidadePorProduto.get(item.produtoId) ?? 0) + item.quantidade)
        }
        const itensAgrupados = Array.from(quantidadePorProduto, ([produtoId, quantidade]) => ({ produtoId, quantidade }))

        const produtos = await prismaClient.produto.findMany({
            where: {
                id: { in: itensAgrupados.map((item) => item.produtoId) },
                empresaId: data.empresaId,
                ativo: true
            }
        })

        if(produtos.length !== itensAgrupados.length){
            throw new AppError('Um ou mais produtos do carrinho não foram encontrados.', 404)
        }

        const produtoPorId = new Map(produtos.map((produto) => [produto.id, produto]))

        // Checagem otimista, com mensagem específica por produto — a garantia real contra
        // concorrência (dois PDVs vendendo o último item ao mesmo tempo) é o update
        // condicional dentro da transação abaixo; isto aqui só evita chegar até lá no
        // caso comum (estoque já insuficiente no momento do pedido).
        for(const item of itensAgrupados){
            const produto = produtoPorId.get(item.produtoId)!
            if(produto.quantidadeAtual < item.quantidade){
                throw new AppError(`Estoque insuficiente para "${produto.nome}" (disponível: ${produto.quantidadeAtual}).`, 400)
            }
        }

        // O preço de cada item é sempre o preço de venda atual do produto, nunca um valor
        // vindo do cliente — evita que uma requisição adulterada registre uma venda por
        // um preço arbitrário.
        const itensParaCriar = itensAgrupados.map((item) => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: produtoPorId.get(item.produtoId)!.precoVenda
        }))

        const total = itensParaCriar.reduce(
            (acumulado, item) => acumulado + Number(item.precoUnitario) * item.quantidade,
            0
        )

        // FIADO exige cliente (já garantido pelo schema/superRefine, mas o service não
        // confia só nisso) e respeita o limite de crédito dele, se houver um definido.
        if(data.formaPagamento === 'FIADO'){
            if(!data.clienteId){
                throw new AppError('Selecione um cliente para registrar uma venda fiado.', 400)
            }

            const cliente = await prismaClient.cliente.findFirst({
                where: { id: data.clienteId, empresaId: data.empresaId, ativo: true }
            })

            if(!cliente){
                throw new AppError('Cliente não encontrado.', 404)
            }

            if(cliente.limiteCredito !== null){
                // Checagem otimista, no mesmo espírito da checagem de estoque acima: cobre o
                // caso comum. Diferente do estoque, não há trava atômica equivalente aqui —
                // duas vendas fiado concorrentes para o MESMO cliente no mesmíssimo instante
                // são um cenário raro o bastante (um PDV, geralmente um operador por vez) pra
                // não justificar a complexidade de uma trava condicional só pra isso; o pior
                // caso é o limite ser ultrapassado por uma fração de segundo até a próxima
                // venda ser bloqueada.
                const saldos = await calcularSaldosDevedores([data.clienteId])
                const saldoAtual = saldos.get(data.clienteId) ?? 0
                const limite = Number(cliente.limiteCredito)

                if(saldoAtual + total > limite){
                    throw new AppError(
                        `Limite de fiado de "${cliente.nome}" seria ultrapassado (saldo atual: ${saldoAtual.toFixed(2)}, limite: ${limite.toFixed(2)}).`,
                        400
                    )
                }
            }
        }

        try{
            const venda = await prismaClient.$transaction(async (tx) => {
                for(const item of itensAgrupados){
                    // Mesma trava condicional do CreateMovimentacaoService: o decremento só
                    // acontece se ainda houver saldo suficiente no momento exato da escrita,
                    // não no momento da checagem otimista acima.
                    await tx.produto.update({
                        where: {
                            id: item.produtoId,
                            empresaId: data.empresaId,
                            ativo: true,
                            quantidadeAtual: { gte: item.quantidade }
                        },
                        data: { quantidadeAtual: { decrement: item.quantidade } }
                    })

                    await tx.movimentacao.create({
                        data: {
                            tipo: 'SAIDA',
                            quantidade: item.quantidade,
                            motivo: MOTIVO_MOVIMENTACAO_VENDA,
                            produtoId: item.produtoId,
                            empresaId: data.empresaId,
                            usuarioId: data.usuarioId
                        }
                    })
                }

                return tx.venda.create({
                    data: {
                        formaPagamento: data.formaPagamento,
                        total,
                        empresaId: data.empresaId,
                        usuarioId: data.usuarioId,
                        clienteId: data.clienteId ?? null,
                        itens: { create: itensParaCriar }
                    },
                    include: itemVendaComProduto
                })
            })

            return venda
        }catch(error){
            // P2025: o estoque de algum produto mudou entre a checagem otimista acima e
            // esta transação (outra venda concorrente consumiu o saldo). A checagem
            // otimista já cobre o caso comum; isto é o desfecho da corrida rara.
            if(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'){
                throw new AppError('O estoque de um dos produtos mudou nesse meio tempo. Revise o carrinho e tente novamente.', 409)
            }
            throw error
        }
    }
}

interface ListVendaFiltros{
    clienteId?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}

export class ListVendaService{
    async execute(empresaId: string, filtros: ListVendaFiltros = {}){
        const page = filtros.page && filtros.page > 0 ? filtros.page : 1
        const limit = filtros.limit && filtros.limit > 0 ? Math.min(filtros.limit, 100) : 20

        // clienteId filtra o extrato de um cliente específico (ver ClienteDetalhePage no
        // front, que combina isso com o histórico de PagamentoFiado num único extrato).
        const where = {
            empresaId,
            ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
        }

        const [vendas, total] = await prismaClient.$transaction([
            prismaClient.venda.findMany({
                where,
                include: {
                    usuario: { select: { nome: true } },
                    _count: { select: { itens: true } }
                },
                orderBy: { criadoEm: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prismaClient.venda.count({ where })
        ])

        return {
            vendas,
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit))
        }
    }
}

export class GetVendaService{
    async execute(id: string, empresaId: string){
        const venda = await prismaClient.venda.findFirst({
            where: { id, empresaId },
            include: {
                usuario: { select: { nome: true } },
                ...itemVendaComProduto
            }
        })

        if(!venda){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        return venda
    }
}
