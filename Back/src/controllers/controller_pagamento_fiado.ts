import type {Response, NextFunction} from 'express'
import type { AuthRequest} from '../middlewares/middlewareAuth.js'
import {
    CreatePagamentoFiadoService,
    ListPagamentoFiadoService
} from '../services/pagamento-fiado.js'
import { SUCCESS_CREATED_ITEM } from "../utils/messages.js";

export class CreatePagamentoFiadoController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const clienteId = req.params.id as string
            const {valor} = req.body
            const empresaId = req.empresaId as string
            const usuarioId = req.id as string

            const createPagamentoFiadoService = new CreatePagamentoFiadoService()

            const pagamento = await createPagamentoFiadoService.execute({valor, clienteId, empresaId, usuarioId})

            return res.status(201).json({message: SUCCESS_CREATED_ITEM.message, pagamento})
        }catch(error){
            next(error)
        }
    }
}

export class ListPagamentoFiadoController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const clienteId = req.params.id as string
            const empresaId = req.empresaId as string

            const listPagamentoFiadoService = new ListPagamentoFiadoService()

            const pagamentos = await listPagamentoFiadoService.execute(clienteId, empresaId)

            return res.status(200).json({pagamentos})
        }catch(error){
            next(error)
        }
    }
}
