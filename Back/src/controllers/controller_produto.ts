import type {Response, NextFunction} from 'express'
import type { AuthRequest} from '../middlewares/middlewareAuth.js'
import {
    CreateProdutoService,
    UpdateProdutoService,
    DeleteProdutoService,
    GetProdutoService,
    ListProdutoService
} from '../services/produto.js'
import {
  SUCCESS_CREATED_ITEM,
  SUCCESS_DELETED_ITEM,
  SUCCESS_UPDATED_ITEM,
} from "../utils/messages.js";

export class CreateProdutoController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const {nome, codigoBarras, sku, descricao, unidadeMedida, precoCusto, precoVenda, quantidadeAtual, estoqueMinimo, imagemUrl, categoriaId} = req.body
            const empresaId = req.empresaId as string

            const createProdutoService = new CreateProdutoService()

            const produto = await createProdutoService.execute({nome, codigoBarras, sku, descricao, unidadeMedida, precoCusto, precoVenda, quantidadeAtual, estoqueMinimo, imagemUrl, categoriaId, empresaId})

            return res.status(201).json({message: SUCCESS_CREATED_ITEM.message, produto})
        }catch(error){
            next(error)
        }
    }
}

export class UpdateProdutoController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const id = req.params.id as string
            // quantidadeAtual não é editável aqui de propósito: estoque só muda via
            // POST /produto/:id/movimentacao, para manter o histórico de movimentações consistente.
            const {nome, codigoBarras, sku, descricao, unidadeMedida, precoCusto, precoVenda, estoqueMinimo, imagemUrl, categoriaId} = req.body
            const empresaId = req.empresaId as string

            const updateProdutoService = new UpdateProdutoService()

            const produto = await updateProdutoService.execute(id, {nome, codigoBarras, sku, descricao, unidadeMedida, precoCusto, precoVenda, estoqueMinimo, imagemUrl, categoriaId, empresaId})

            return res.status(200).json({message: SUCCESS_UPDATED_ITEM.message, produto})
        }catch(error){
            next(error)
        }
    }
}

export class DeleteProdutoController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const id = req.params.id as string
            const empresaId = req.empresaId as string

            const deleteProdutoService = new DeleteProdutoService()

            const produto = await deleteProdutoService.execute(id, empresaId)

            return res.status(200).json({message: SUCCESS_DELETED_ITEM.message, produto})
        }catch(error){
            next(error)
        }
    }
}

export class GetProdutoController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const id = req.params.id as string
            const empresaId = req.empresaId as string

            const getProdutoService = new GetProdutoService()

            const produto = await getProdutoService.execute(id, empresaId)

            return res.status(200).json({produto})
        }catch(error){
            next(error)
        }
    }
}

export class ListProdutoController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const empresaId = req.empresaId as string
            const { busca, categoriaId, estoqueBaixo, page, limit, sortBy, sortOrder } = req.query

            const listProdutoService = new ListProdutoService()

            const resultado = await listProdutoService.execute(empresaId, {
                busca: busca as string | undefined,
                categoriaId: categoriaId as string | undefined,
                estoqueBaixo: estoqueBaixo === 'true',
                page: page ? Number(page) : undefined,
                limit: limit ? Number(limit) : undefined,
                sortBy: sortBy as 'nome' | 'precoVenda' | 'quantidadeAtual' | 'criadoEm' | undefined,
                sortOrder: sortOrder as 'asc' | 'desc' | undefined,
            })

            return res.status(200).json(resultado)
        }catch(error){
            next(error)
        }
    }
}
