import { Prisma } from '@prisma/client'
import prismaClient from '../conf/prisma.js'
import { AppError } from '../utils/AppError.js'
import { ERROR_NOT_FOUND } from '../utils/messages.js';

interface Produto{
    nome: string;
    codigoBarras?: string;
    sku?: string;
    descricao?: string;
    unidadeMedida?: string;
    precoCusto: number;
    precoVenda: number;
    quantidadeAtual?: number;
    estoqueMinimo?: number;
    imagemUrl?: string;
    categoriaId?: string;
    empresaId: string;
}

export class CreateProdutoService{
    async execute(data: Produto){
        if(data.categoriaId){
            const categoriaExistente = await prismaClient.categoria.findFirst({
                where: {
                    id: data.categoriaId,
                    empresaId: data.empresaId,
                    ativo: true
                }
            })

            if(!categoriaExistente){
                throw new AppError("Categoria não encontrada para a empresa informada.", 400)
            }
        }

        if(data.sku){
            const produtoComMesmoSku = await prismaClient.produto.findFirst({
                where: {
                    sku: data.sku,
                    empresaId: data.empresaId,
                    ativo: true
                }
            })

            if(produtoComMesmoSku){
                throw new AppError("Já existe um produto com o mesmo SKU para a empresa informada.", 409)
            }
        }

        if(data.codigoBarras){
            const produtoComMesmoCodigoBarras = await prismaClient.produto.findFirst({
                where: {
                    codigoBarras: data.codigoBarras,
                    empresaId: data.empresaId,
                    ativo: true
                }
            })

            if(produtoComMesmoCodigoBarras){
                throw new AppError("Já existe um produto com o mesmo código de barras para a empresa informada.", 409)
            }
        }

        const produto = await prismaClient.produto.create({
            data: {
                nome: data.nome,
                codigoBarras: data.codigoBarras ?? null,
                sku: data.sku ?? null,
                descricao: data.descricao ?? null,
                unidadeMedida: data.unidadeMedida ?? "UN",
                precoCusto: data.precoCusto,
                precoVenda: data.precoVenda,
                quantidadeAtual: data.quantidadeAtual ?? 0,
                estoqueMinimo: data.estoqueMinimo ?? 5,
                imagemUrl: data.imagemUrl ?? null,
                categoriaId: data.categoriaId ?? null,
                empresaId: data.empresaId
            }
        })

        return produto;
    }
}

export class UpdateProdutoService{
    async execute(id: string, data: Produto){
        const produtoExistente = await prismaClient.produto.findFirst({
            where: {
                id: id,
                empresaId: data.empresaId,
                ativo: true
            }
        })

        if(!produtoExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        if(data.categoriaId){
            const categoriaExistente = await prismaClient.categoria.findFirst({
                where: {
                    id: data.categoriaId,
                    empresaId: data.empresaId,
                    ativo: true
                }
            })

            if(!categoriaExistente){
                throw new AppError("Categoria não encontrada para a empresa informada.", 400)
            }
        }

        if(data.sku){
            const produtoComMesmoSku = await prismaClient.produto.findFirst({
                where: {
                    sku: data.sku,
                    empresaId: data.empresaId,
                    ativo: true
                }
            })

            if(produtoComMesmoSku && produtoComMesmoSku.id !== id){
                throw new AppError("Já existe um produto com o mesmo SKU para a empresa informada.", 409)
            }
        }

        if(data.codigoBarras){
            const produtoComMesmoCodigoBarras = await prismaClient.produto.findFirst({
                where: {
                    codigoBarras: data.codigoBarras,
                    empresaId: data.empresaId,
                    ativo: true
                }
            })

            if(produtoComMesmoCodigoBarras && produtoComMesmoCodigoBarras.id !== id){
                throw new AppError("Já existe um produto com o mesmo código de barras para a empresa informada.", 409)
            }
        }

        // Campos opcionais não enviados mantêm o valor já existente no produto,
        // em vez de serem resetados para null/default (evita zerar estoque/atributos ao editar só o preço).
        const produtoAtualizado = await prismaClient.produto.update({
            where: {
                id: id
            },
            data: {
                nome: data.nome,
                codigoBarras: data.codigoBarras ?? produtoExistente.codigoBarras,
                sku: data.sku ?? produtoExistente.sku,
                descricao: data.descricao ?? produtoExistente.descricao,
                unidadeMedida: data.unidadeMedida ?? produtoExistente.unidadeMedida,
                precoCusto: data.precoCusto,
                precoVenda: data.precoVenda,
                // Estoque nunca é escrito diretamente por aqui: só muda via CreateMovimentacaoService,
                // para o histórico de movimentações nunca divergir da quantidade real do produto.
                quantidadeAtual: produtoExistente.quantidadeAtual,
                estoqueMinimo: data.estoqueMinimo ?? produtoExistente.estoqueMinimo,
                imagemUrl: data.imagemUrl ?? produtoExistente.imagemUrl,
                categoriaId: data.categoriaId ?? produtoExistente.categoriaId,
                empresaId: data.empresaId
            }
        })

        return produtoAtualizado;
    }
}

export class DeleteProdutoService{
    async execute(id: string, empresaId: string){
        const produtoExistente = await prismaClient.produto.findFirst({
            where: {
                id: id,
                empresaId: empresaId,
                ativo: true
            }
        })

        if(!produtoExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const produto = await prismaClient.produto.update({
            where: {
                id: id
            },
            data: {
                ativo: false,
                // Libera o SKU/código de barras (únicos por empresa entre produtos ativos)
                // para que um novo produto possa reutilizá-los depois deste ser excluído.
                sku: null,
                codigoBarras: null
            },
            select: {
                id: true,
                nome: true
            }
        })

        return produto;
    }
}

export class GetProdutoService{
    async execute(id: string, empresaId: string){
        const produto = await prismaClient.produto.findFirst({
            where: {
                id: id,
                empresaId: empresaId,
                ativo: true
            },
            include: {
                categoria: {
                    select: {
                        nome: true
                    }
                },
                // Usado pela tela de exclusão pra avisar quanto histórico está em jogo
                // antes de confirmar (movimentação é imutável, nunca é removida).
                _count: {
                    select: {
                        movimentacoes: true
                    }
                }
            }
        })

        if(!produto){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        return produto;
    }
}

type ProdutoOrdenavel = 'nome' | 'precoVenda' | 'quantidadeAtual' | 'criadoEm';

interface ListProdutoFiltros{
    nome?: string | undefined;
    categoriaId?: string | undefined;
    estoqueBaixo?: boolean | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: ProdutoOrdenavel | undefined;
    sortOrder?: 'asc' | 'desc' | undefined;
}

// Nomes de coluna reais, entre aspas duplas, para montar o ORDER BY do caminho SQL
// (estoqueBaixo) com segurança: o valor nunca vem direto da requisição, só passa por
// aqui depois de já validado contra o enum do schema Zod — este mapa é a segunda
// barreira (defesa em profundidade), não a única.
const COLUNAS_ORDENAVEIS: Record<ProdutoOrdenavel, string> = {
    nome: '"nome"',
    precoVenda: '"precoVenda"',
    quantidadeAtual: '"quantidadeAtual"',
    criadoEm: '"criadoEm"',
}

export class ListProdutoService{
    async execute(empresaId: string, filtros: ListProdutoFiltros = {}){
        const page = filtros.page && filtros.page > 0 ? filtros.page : 1
        const limit = filtros.limit && filtros.limit > 0 ? Math.min(filtros.limit, 100) : 20
        const sortBy: ProdutoOrdenavel = filtros.sortBy ?? 'nome'
        const sortOrder: 'asc' | 'desc' = filtros.sortOrder ?? 'asc'

        const where = {
            empresaId: empresaId,
            ativo: true,
            ...(filtros.nome ? { nome: { contains: filtros.nome, mode: 'insensitive' as const } } : {}),
            ...(filtros.categoriaId ? { categoriaId: filtros.categoriaId } : {}),
        }

        // "Estoque baixo" compara quantidadeAtual com estoqueMinimo, duas colunas do mesmo
        // registro — o Prisma não suporta esse tipo de comparação no `where` do query builder,
        // então essa parte da consulta (filtro + contagem + paginação) é feita em SQL. Os ids
        // já paginados são então buscados via Prisma normalmente, para reaproveitar o mesmo
        // formato de retorno (com `categoria` incluída) usado no restante do serviço.
        if(filtros.estoqueBaixo){
            const condicoes: Prisma.Sql[] = [
                Prisma.sql`"empresaId" = ${empresaId}::uuid`,
                Prisma.sql`"ativo" = true`,
                Prisma.sql`"quantidadeAtual" <= "estoqueMinimo"`
            ]

            if(filtros.nome){
                condicoes.push(Prisma.sql`"nome" ILIKE ${'%' + filtros.nome + '%'}`)
            }

            if(filtros.categoriaId){
                condicoes.push(Prisma.sql`"categoriaId" = ${filtros.categoriaId}::uuid`)
            }

            const whereSql = Prisma.join(condicoes, ' AND ')
            const ordenacaoSql = Prisma.raw(`${COLUNAS_ORDENAVEIS[sortBy]} ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`)

            const [idsOrdenados, contagem] = await Promise.all([
                prismaClient.$queryRaw<{ id: string }[]>`
                    SELECT id FROM "Produto"
                    WHERE ${whereSql}
                    ORDER BY ${ordenacaoSql}
                    LIMIT ${limit} OFFSET ${(page - 1) * limit}
                `,
                prismaClient.$queryRaw<{ total: bigint }[]>`
                    SELECT COUNT(*)::bigint AS total FROM "Produto" WHERE ${whereSql}
                `
            ])

            const ids = idsOrdenados.map(p => p.id)

            const produtosSemOrdem = await prismaClient.produto.findMany({
                where: { id: { in: ids } },
                include: {
                    categoria: {
                        select: {
                            nome: true
                        }
                    },
                    _count: {
                        select: {
                            movimentacoes: true
                        }
                    }
                }
            })

            // `findMany` com `id: { in }` não garante preservar a ordem da lista de ids,
            // então a ordem definida pela query SQL (nome asc, já paginada) é reaplicada aqui.
            const posicaoPorId = new Map(ids.map((id, indice) => [id, indice]))
            const produtos = produtosSemOrdem.sort(
                (a, b) => (posicaoPorId.get(a.id) ?? 0) - (posicaoPorId.get(b.id) ?? 0)
            )

            const total = Number(contagem[0]?.total ?? 0n)

            return {
                produtos,
                total,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(total / limit))
            }
        }

        const [produtos, total] = await prismaClient.$transaction([
            prismaClient.produto.findMany({
                where,
                include: {
                    categoria: {
                        select: {
                            nome: true
                        }
                    },
                    _count: {
                        select: {
                            movimentacoes: true
                        }
                    }
                },
                orderBy: {
                    [sortBy]: sortOrder
                },
                skip: (page - 1) * limit,
                take: limit
            }),
            prismaClient.produto.count({ where })
        ])

        return {
            produtos,
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit))
        };
    }
}
