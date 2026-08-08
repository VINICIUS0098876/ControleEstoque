import type {Response, NextFunction} from 'express'
import type { AuthRequest} from '../middlewares/middlewareAuth.js'
import {
    CreateCategoriaService,
    UpdateCategoriaService,
    DeleteCategoriaService,
    GetCategoriaService,
    ListCategoriaService
} from '../services/categoria.js'
import {
  SUCCESS_CREATED_ITEM,
  SUCCESS_DELETED_ITEM,
  SUCCESS_UPDATED_ITEM,
} from "../utils/messages.js";

export class CreateCategoriaController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const {nome} = req.body
            const empresaId = req.empresaId as string

            const createCategoriaService = new CreateCategoriaService()

            const categoria = await createCategoriaService.execute({nome, empresaId})

            return res.status(201).json({message: SUCCESS_CREATED_ITEM.message, categoria})
        }catch(error){
            next(error)
        }
    }
}

export class UpdateCategoriaController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const id = req.params.id as string
            const {nome} = req.body
            const empresaId = req.empresaId as string

            const updateCategoriaService = new UpdateCategoriaService()

            const categoria = await updateCategoriaService.execute(id, {nome, empresaId})

            return res.status(200).json({message: SUCCESS_UPDATED_ITEM.message, categoria})
        }catch(error){
            next(error)
        }
    }
}

export class DeleteCategoriaController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const id = req.params.id as string
            const empresaId = req.empresaId as string

            const deleteCategoriaService = new DeleteCategoriaService()

            const categoria = await deleteCategoriaService.execute(id, empresaId)

            return res.status(200).json({message: SUCCESS_DELETED_ITEM.message, categoria})
        }catch(error){
            next(error)
        }
    }
}

export class GetCategoriaController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const id = req.params.id as string
            const empresaId = req.empresaId as string

            const getCategoriaService = new GetCategoriaService()

            const categoria = await getCategoriaService.execute(id, empresaId)

            return res.status(200).json({categoria})
        }catch(error){
            next(error)
        }
    }
}

export class ListCategoriaController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const empresaId = req.empresaId as string
            const { nome } = req.query

            const listCategoriaService = new ListCategoriaService()

            const categorias = await listCategoriaService.execute(empresaId, { nome: nome as string | undefined })

            return res.status(200).json({categorias})
        }catch(error){
            next(error)
        }
    }
}
