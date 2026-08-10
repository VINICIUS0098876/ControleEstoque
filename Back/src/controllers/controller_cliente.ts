import type {Response, NextFunction} from 'express'
import type { AuthRequest} from '../middlewares/middlewareAuth.js'
import {
    CreateClienteService,
    UpdateClienteService,
    DeleteClienteService,
    GetClienteService,
    ListClienteService
} from '../services/cliente.js'
import {
  SUCCESS_CREATED_ITEM,
  SUCCESS_DELETED_ITEM,
  SUCCESS_UPDATED_ITEM,
} from "../utils/messages.js";

export class CreateClienteController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const {nome, telefone, limiteCredito} = req.body
            const empresaId = req.empresaId as string

            const createClienteService = new CreateClienteService()

            const cliente = await createClienteService.execute({nome, telefone, limiteCredito, empresaId})

            return res.status(201).json({message: SUCCESS_CREATED_ITEM.message, cliente})
        }catch(error){
            next(error)
        }
    }
}

export class UpdateClienteController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const id = req.params.id as string
            const {nome, telefone, limiteCredito} = req.body
            const empresaId = req.empresaId as string

            const updateClienteService = new UpdateClienteService()

            const cliente = await updateClienteService.execute(id, {nome, telefone, limiteCredito, empresaId})

            return res.status(200).json({message: SUCCESS_UPDATED_ITEM.message, cliente})
        }catch(error){
            next(error)
        }
    }
}

export class DeleteClienteController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const id = req.params.id as string
            const empresaId = req.empresaId as string

            const deleteClienteService = new DeleteClienteService()

            const cliente = await deleteClienteService.execute(id, empresaId)

            return res.status(200).json({message: SUCCESS_DELETED_ITEM.message, cliente})
        }catch(error){
            next(error)
        }
    }
}

export class GetClienteController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const id = req.params.id as string
            const empresaId = req.empresaId as string

            const getClienteService = new GetClienteService()

            const cliente = await getClienteService.execute(id, empresaId)

            return res.status(200).json({cliente})
        }catch(error){
            next(error)
        }
    }
}

export class ListClienteController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const empresaId = req.empresaId as string
            const { busca, page, limit, sortBy, sortOrder } = req.query

            const listClienteService = new ListClienteService()

            const resultado = await listClienteService.execute(empresaId, {
                busca: busca as string | undefined,
                page: page ? Number(page) : undefined,
                limit: limit ? Number(limit) : undefined,
                sortBy: sortBy as 'nome' | 'saldoDevedor' | undefined,
                sortOrder: sortOrder as 'asc' | 'desc' | undefined,
            })

            return res.status(200).json(resultado)
        }catch(error){
            next(error)
        }
    }
}
