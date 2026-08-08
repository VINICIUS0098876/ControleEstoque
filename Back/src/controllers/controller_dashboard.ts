import type {Response, NextFunction} from 'express'
import type { AuthRequest} from '../middlewares/middlewareAuth.js'
import { GetResumoEstoqueService, GetMovimentacoesPorDiaService } from '../services/dashboard.js'

export class GetResumoEstoqueController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const empresaId = req.empresaId as string

            const getResumoEstoqueService = new GetResumoEstoqueService()

            const resumo = await getResumoEstoqueService.execute(empresaId)

            return res.status(200).json(resumo)
        }catch(error){
            next(error)
        }
    }
}

export class GetMovimentacoesPorDiaController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const empresaId = req.empresaId as string
            const dias = req.query.dias ? Number(req.query.dias) : undefined

            const getMovimentacoesPorDiaService = new GetMovimentacoesPorDiaService()

            const movimentacoes = await getMovimentacoesPorDiaService.execute(empresaId, dias)

            return res.status(200).json({ movimentacoes })
        }catch(error){
            next(error)
        }
    }
}
