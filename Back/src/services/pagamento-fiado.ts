import prismaClient from '../conf/prisma.js'
import { AppError } from '../utils/AppError.js'
import { ERROR_NOT_FOUND } from '../utils/messages.js'
import { calcularSaldosDevedores } from './cliente.js'

interface CreatePagamentoFiado{
    valor: number;
    clienteId: string;
    empresaId: string;
    usuarioId: string;
}

// Registra um pagamento que abate o saldo devedor de fiado — não há checagem de "valor
// não pode ser maior que o saldo devedor": um pagamento a mais só deixa o saldo negativo
// (crédito a favor do cliente), o que é uma situação válida, não um erro.
export class CreatePagamentoFiadoService{
    async execute(data: CreatePagamentoFiado){
        const cliente = await prismaClient.cliente.findFirst({
            where: {
                id: data.clienteId,
                empresaId: data.empresaId,
                ativo: true
            }
        })

        if(!cliente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const pagamento = await prismaClient.pagamentoFiado.create({
            data: {
                valor: data.valor,
                clienteId: data.clienteId,
                empresaId: data.empresaId,
                usuarioId: data.usuarioId
            }
        })

        const saldos = await calcularSaldosDevedores([data.clienteId])

        return { ...pagamento, saldoDevedor: saldos.get(data.clienteId) ?? 0 }
    }
}

export class ListPagamentoFiadoService{
    async execute(clienteId: string, empresaId: string){
        const cliente = await prismaClient.cliente.findFirst({
            where: {
                id: clienteId,
                empresaId: empresaId,
                ativo: true
            }
        })

        if(!cliente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const pagamentos = await prismaClient.pagamentoFiado.findMany({
            where: {
                clienteId: clienteId,
                empresaId: empresaId
            },
            orderBy: {
                criadoEm: 'desc'
            },
            include: {
                usuario: {
                    select: { nome: true }
                }
            }
        })

        return pagamentos
    }
}
