import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { errorMiddleware } from './errorMiddleware.js'
import { AppError } from '../utils/AppError.js'

function criarResMock() {
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    }
    return res as unknown as Response
}

function criarReqMock() {
    const req = {
        log: {
            warn: vi.fn(),
            error: vi.fn(),
        },
    }
    return req as unknown as Request
}

describe('errorMiddleware', () => {
    let req: Request
    let res: Response

    beforeEach(() => {
        req = criarReqMock()
        res = criarResMock()
    })

    it('responde com o statusCode e a mensagem de um AppError', () => {
        const erro = new AppError('Estoque insuficiente para realizar esta saída.', 400)

        errorMiddleware(erro, req, res, vi.fn())

        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith({ message: 'Estoque insuficiente para realizar esta saída.' })
    })

    it('traduz violação de unique constraint (P2002) do Prisma em 409', () => {
        const erro = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '7.9.1',
        })

        errorMiddleware(erro, req, res, vi.fn())

        expect(res.status).toHaveBeenCalledWith(409)
    })

    it('traduz registro não encontrado (P2025) do Prisma em 404', () => {
        const erro = new Prisma.PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
            clientVersion: '7.9.1',
        })

        errorMiddleware(erro, req, res, vi.fn())

        expect(res.status).toHaveBeenCalledWith(404)
    })

    it('cai no 500 genérico para qualquer outro erro não tratado', () => {
        errorMiddleware(new Error('boom'), req, res, vi.fn())

        expect(res.status).toHaveBeenCalledWith(500)
        expect(req.log.error).toHaveBeenCalled()
    })
})
