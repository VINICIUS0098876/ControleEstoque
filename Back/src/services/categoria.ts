import prismaClient from '../conf/prisma.js'
import { AppError } from '../utils/AppError.js'
import { ERROR_NOT_FOUND } from '../utils/messages.js';


interface Categoria{
    nome: string;
    empresaId: string;
}

export class CreateCategoriaService{
    async execute({nome, empresaId}: Categoria){
        const categoriaExistente = await prismaClient.categoria.findFirst({
            where: {
                nome: nome,
                empresaId: empresaId,
                ativo: true
            }
        })

        if(categoriaExistente){
            throw new AppError("Sua empresa já possui uma categoria com esse nome. Por favor, escolha outro nome.", 409)
        }

        const categoria = await prismaClient.categoria.create({
            data: {
                nome: nome,
                empresaId: empresaId,
            },
            select: {
                id: true,
                nome: true
            }
        })

        return categoria
    }
}

export class UpdateCategoriaService{
    async execute(id: string, {nome, empresaId}: Categoria){
        const categoriaExistente = await prismaClient.categoria.findFirst({
            where: {
                id: id,
                empresaId: empresaId,
                ativo: true
            }
        })

        if(!categoriaExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const categoriaComMesmoNome = await prismaClient.categoria.findFirst({
            where: {
                nome: nome,
                empresaId: empresaId,
                ativo: true
            }
        })

        if(categoriaComMesmoNome && categoriaComMesmoNome.id !== id){
            throw new AppError("Sua empresa já possui uma categoria com esse nome. Por favor, escolha outro nome.", 409)
        }

        const categoria = await prismaClient.categoria.update({
            where: {
                id: id
            },
            data: {
                nome: nome,
            },
            select: {
                id: true,
                nome: true
            }
        })

        return categoria
    }
}

export class DeleteCategoriaService{
    async execute(id: string, empresaId: string){
        const categoriaExistente = await prismaClient.categoria.findFirst({
            where: {
                id: id,
                empresaId: empresaId,
                ativo: true
            }
        })

        if(!categoriaExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const categoria = await prismaClient.categoria.update({
            where: {
                id: id
            },
            data: {
                ativo: false
            }
        })

        return categoria
    }
}

export class GetCategoriaService{
    async execute(id: string, empresaId: string){
        const categoria = await prismaClient.categoria.findFirst({
            where: {
                id: id,
                empresaId: empresaId,
                ativo: true
            },
            include: {
                // Usado pela tela de exclusão pra avisar quantos produtos ativos ficariam
                // sem categoria antes de confirmar.
                _count: {
                    select: {
                        produtos: {
                            where: { ativo: true }
                        }
                    }
                }
            }
        })

        if(!categoria){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        return categoria
    }
}

interface ListCategoriaFiltros{
    nome?: string | undefined;
}

export class ListCategoriaService{
    async execute(empresaId: string, filtros: ListCategoriaFiltros = {}){
        const empresaExistente = await prismaClient.empresa.findFirst({
            where: {
                id: empresaId,
                ativo: true
            }
        })

        if(!empresaExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const categorias = await prismaClient.categoria.findMany({
            where: {
                empresaId: empresaId,
                ativo: true,
                ...(filtros.nome ? { nome: { contains: filtros.nome, mode: 'insensitive' as const } } : {}),
            },
            include: {
                _count: {
                    select: {
                        produtos: {
                            where: { ativo: true }
                        }
                    }
                }
            },
            orderBy: {
                nome: 'asc'
            }
        })

        return categorias
    }
}
