import type {Response, NextFunction} from 'express'
import type { AuthRequest} from '../middlewares/middlewareAuth.js'
import {
    GetResumoEstoqueService,
    GetMovimentacoesPorDiaService,
    GetVendasResumoService,
    GetVendasPorDiaService,
    GetProdutosMaisVendidosService,
    GetFiadoResumoService
} from '../services/dashboard.js'

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

export class GetVendasResumoController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const empresaId = req.empresaId as string

            const getVendasResumoService = new GetVendasResumoService()

            const resumo = await getVendasResumoService.execute(empresaId)

            return res.status(200).json(resumo)
        }catch(error){
            next(error)
        }
    }
}

export class GetVendasPorDiaController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const empresaId = req.empresaId as string
            const dias = req.query.dias ? Number(req.query.dias) : undefined

            const getVendasPorDiaService = new GetVendasPorDiaService()

            const vendas = await getVendasPorDiaService.execute(empresaId, dias)

            return res.status(200).json({ vendas })
        }catch(error){
            next(error)
        }
    }
}

export class GetProdutosMaisVendidosController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const empresaId = req.empresaId as string
            const dias = req.query.dias ? Number(req.query.dias) : undefined
            const limit = req.query.limit ? Number(req.query.limit) : undefined

            const getProdutosMaisVendidosService = new GetProdutosMaisVendidosService()

            const produtos = await getProdutosMaisVendidosService.execute(empresaId, dias, limit)

            return res.status(200).json({ produtos })
        }catch(error){
            next(error)
        }
    }
}

export class GetFiadoResumoController{
    async handle(req: AuthRequest, res: Response, next: NextFunction){
        try{
            const empresaId = req.empresaId as string

            const getFiadoResumoService = new GetFiadoResumoService()

            const resumo = await getFiadoResumoService.execute(empresaId)

            return res.status(200).json(resumo)
        }catch(error){
            next(error)
        }
    }
}
