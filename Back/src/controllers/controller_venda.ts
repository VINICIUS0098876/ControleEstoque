import type {Response, NextFunction} from 'express'
import type { AuthRequest} from '../middlewares/middlewareAuth.js'
import {
    CreateVendaService,
    ListVendaService,
    GetVendaService
} from '../services/venda.js'
import { SUCCESS_CREATED_ITEM } from "../utils/messages.js";

export class CreateVendaController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const {formaPagamento, clienteId, itens} = req.body
            const empresaId = req.empresaId as string
            const usuarioId = req.id as string

            const createVendaService = new CreateVendaService()

            const venda = await createVendaService.execute({formaPagamento, clienteId, itens, empresaId, usuarioId})

            return res.status(201).json({message: SUCCESS_CREATED_ITEM.message, venda})
        }catch(error){
            next(error)
        }
    }
}

export class ListVendaController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const empresaId = req.empresaId as string
            const { clienteId, page, limit } = req.query

            const listVendaService = new ListVendaService()

            const resultado = await listVendaService.execute(empresaId, {
                clienteId: clienteId as string | undefined,
                page: page ? Number(page) : undefined,
                limit: limit ? Number(limit) : undefined,
            })

            return res.status(200).json(resultado)
        }catch(error){
            next(error)
        }
    }
}

export class GetVendaController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const id = req.params.id as string
            const empresaId = req.empresaId as string

            const getVendaService = new GetVendaService()

            const venda = await getVendaService.execute(id, empresaId)

            return res.status(200).json({venda})
        }catch(error){
            next(error)
        }
    }
}
