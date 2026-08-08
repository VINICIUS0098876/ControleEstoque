import type {Response, NextFunction} from 'express'
import type { AuthRequest} from '../middlewares/middlewareAuth.js'
import {
    CreateMovimentacaoService,
    ListMovimentacaoService
} from '../services/movimentacao.js'
import {
  SUCCESS_CREATED_ITEM,
} from "../utils/messages.js";

export class CreateMovimentacaoController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const produtoId = req.params.id as string
            const {tipo, quantidade, motivo} = req.body
            const empresaId = req.empresaId as string
            const usuarioId = req.id as string

            const createMovimentacaoService = new CreateMovimentacaoService()

            const movimentacao = await createMovimentacaoService.execute({tipo, quantidade, motivo, produtoId, empresaId, usuarioId})

            return res.status(201).json({message: SUCCESS_CREATED_ITEM.message, movimentacao})
        }catch(error){
            next(error)
        }
    }
}

export class ListMovimentacaoController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const produtoId = req.params.id as string
            const empresaId = req.empresaId as string

            const listMovimentacaoService = new ListMovimentacaoService()

            const movimentacoes = await listMovimentacaoService.execute(produtoId, empresaId)

            return res.status(200).json({movimentacoes})
        }catch(error){
            next(error)
        }
    }
}
