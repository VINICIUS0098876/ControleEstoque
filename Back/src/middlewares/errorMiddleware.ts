import type {Request, Response, NextFunction} from 'express'
import { Prisma } from '@prisma/client'
import { AppError } from '../utils/AppError.js'
import { ERROR_INTERNAL_SERVER_DB, ERROR_CONFLICT, ERROR_NOT_FOUND } from '../utils/messages.js';
import { env } from '../conf/env.js'

export function errorMiddleware(err: Error, req: Request, res: Response, _next: NextFunction){
    if (err instanceof AppError) {
        // Nível "warn": erro de regra de negócio esperado (validação, conflito, 404), não
        // uma falha da aplicação — fica no log pra dar contexto, sem poluir alertas de erro.
        req.log.warn({ statusCode: err.statusCode }, err.message)
        return res.status(err.statusCode).json({ message: err.message });
    }

    // JSON malformado no corpo da requisição: erro do body-parser (express.json()),
    // não uma falha da aplicação. Sem essa checagem cairia no fallback de 500 abaixo.
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
        req.log.warn({ statusCode: 400 }, 'Corpo da requisição com JSON inválido')
        return res.status(400).json({ message: 'O corpo da requisição contém um JSON inválido.' });
    }

    // Safety net para violações de constraint do Postgres que passem pelas checagens feitas
    // nos services (ex: duas requisições concorrentes criando o mesmo SKU ao mesmo tempo).
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            req.log.warn({ code: err.code }, 'Violação de constraint única')
            return res.status(409).json({ message: ERROR_CONFLICT.message });
        }
        if (err.code === 'P2025') {
            req.log.warn({ code: err.code }, 'Registro não encontrado para a operação')
            return res.status(404).json({ message: ERROR_NOT_FOUND.message });
        }
    }

    req.log.error({ err }, 'Erro não tratado');

    return res.status(500).json({ message: ERROR_INTERNAL_SERVER_DB.message, details: env.NODE_ENV === 'production' ? null : err.message });
}
