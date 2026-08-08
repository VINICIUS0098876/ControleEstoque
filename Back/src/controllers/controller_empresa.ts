import type {Request, Response, NextFunction} from 'express'
import type { AuthRequest} from '../middlewares/middlewareAuth.js'
import {CreateEmpresaService, UpdateEmpresaService, DeleteEmpresaService, GetEmpresaService} from '../services/empresa.js'
import {
  SUCCESS_CREATED_ITEM,
  SUCCESS_DELETED_ITEM,
  SUCCESS_UPDATED_ITEM,
} from "../utils/messages.js";

export class CreateEmpresaController{
    async handle(req: Request, res: Response, next: NextFunction){
        try{
            const {nome, cnpj, logoUrl, temaCor, adminNome, adminEmail, adminSenha} = req.body

            const createEmpresaService = new CreateEmpresaService()

            const empresa = await createEmpresaService.execute({nome, cnpj, logoUrl, temaCor, adminNome, adminEmail, adminSenha})

            return res.status(201).json({message: SUCCESS_CREATED_ITEM.message, empresa})
        }catch (error) {
            next(error)
        }
    }
}

export class UpdateEmpresaController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const id = req.empresaId as string
            const {nome, cnpj, logoUrl, temaCor} = req.body

            const updateEmpresaService = new UpdateEmpresaService()

            const empresa = await updateEmpresaService.execute(id, {nome, cnpj, logoUrl, temaCor})

            return res.status(200).json({message: SUCCESS_UPDATED_ITEM.message, empresa})
        }catch (error) {
            next(error)
        }
    }
}

export class DeleteEmpresaController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const id = req.empresaId as string

            const deleteEmpresaService = new DeleteEmpresaService()

            await deleteEmpresaService.execute(id)

            return res.status(200).json({message: SUCCESS_DELETED_ITEM.message})
        }catch (error) {
            next(error)
        }
    }
}

export class GetEmpresaController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const id = req.empresaId as string

            const getEmpresaService = new GetEmpresaService()

            const empresa = await getEmpresaService.execute(id)

            return res.status(200).json({empresa})
        }catch (error) {
            next(error)
        }
    }
}
