import { Prisma } from '@prisma/client'
import prismaClient from '../conf/prisma.js'
import { AppError } from '../utils/AppError.js'
import { ERROR_NOT_FOUND } from '../utils/messages.js';

type TipoMovimentacao = 'ENTRADA' | 'SAIDA' | 'ESTORNO';

interface Movimentacao{
    tipo: TipoMovimentacao;
    quantidade: number;
    motivo?: string;
    produtoId: string;
    empresaId: string;
    usuarioId?: string;
}

export class CreateMovimentacaoService{
    async execute(data: Movimentacao){
        const produto = await prismaClient.produto.findFirst({
            where: {
                id: data.produtoId,
                empresaId: data.empresaId,
                ativo: true
            }
        })

        if(!produto){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        // ENTRADA e ESTORNO somam ao estoque (estorno desfaz uma saída anterior); SAIDA subtrai.
        const entrada = data.tipo === 'ENTRADA' || data.tipo === 'ESTORNO'

        // O ajuste de estoque usa increment/decrement atômico no banco (não soma em memória
        // a partir do valor lido acima) e, na saída, só é aplicado se ainda houver saldo
        // suficiente no momento exato da escrita. Isso evita "lost update": duas saídas
        // concorrentes do mesmo produto não podem mais ler o mesmo saldo e ambas passarem.
        try{
            const [, movimentacao] = await prismaClient.$transaction([
                prismaClient.produto.update({
                    where: entrada
                        ? { id: data.produtoId, empresaId: data.empresaId, ativo: true }
                        : {
                            id: data.produtoId,
                            empresaId: data.empresaId,
                            ativo: true,
                            quantidadeAtual: { gte: data.quantidade }
                        },
                    data: {
                        quantidadeAtual: entrada
                            ? { increment: data.quantidade }
                            : { decrement: data.quantidade }
                    }
                }),
                prismaClient.movimentacao.create({
                    data: {
                        tipo: data.tipo,
                        quantidade: data.quantidade,
                        motivo: data.motivo ?? null,
                        produtoId: data.produtoId,
                        empresaId: data.empresaId,
                        usuarioId: data.usuarioId ?? null
                    }
                })
            ])

            return movimentacao
        }catch(error){
            // P2025: o `where` guardado acima não encontrou nenhuma linha compatível.
            // Para SAIDA, isso significa que o saldo já não é mais suficiente.
            if(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'){
                throw new AppError("Estoque insuficiente para realizar esta saída.", 400)
            }
            throw error
        }
    }
}

export class ListMovimentacaoService{
    async execute(produtoId: string, empresaId: string){
        const produto = await prismaClient.produto.findFirst({
            where: {
                id: produtoId,
                empresaId: empresaId,
                ativo: true
            }
        })

        if(!produto){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const movimentacoes = await prismaClient.movimentacao.findMany({
            where: {
                produtoId: produtoId,
                empresaId: empresaId
            },
            orderBy: {
                criadoEm: 'desc'
            },
            include: {
                usuario: {
                    select: {
                        nome: true
                    }
                }
            }
        })

        return movimentacoes
    }
}
