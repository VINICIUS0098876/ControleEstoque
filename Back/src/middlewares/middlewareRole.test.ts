import { describe, it, expect, vi } from 'vitest'
import type { Response } from 'express'
import { requireRole } from './middlewareRole.js'
import type { AuthRequest } from './middlewareAuth.js'

function criarResMock() {
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    }
    return res as unknown as Response
}

describe('requireRole', () => {
    it('chama next() quando o papel do usuário está na lista permitida', () => {
        const next = vi.fn()
        const req = { papel: 'ADMIN' } as AuthRequest
        const res = criarResMock()

        requireRole('ADMIN')(req, res, next)

        expect(next).toHaveBeenCalledOnce()
        expect(res.status).not.toHaveBeenCalled()
    })

    it('bloqueia com 403 quando o papel do usuário não está na lista permitida', () => {
        const next = vi.fn()
        const req = { papel: 'FUNCIONARIO' } as AuthRequest
        const res = criarResMock()

        requireRole('ADMIN')(req, res, next)

        expect(next).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(403)
    })

    it('bloqueia com 403 quando req.papel não foi preenchido (authMiddleware não rodou)', () => {
        const next = vi.fn()
        const req = {} as AuthRequest
        const res = criarResMock()

        requireRole('ADMIN')(req, res, next)

        expect(next).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(403)
    })

    it('aceita múltiplos papéis permitidos', () => {
        const next = vi.fn()
        const req = { papel: 'FUNCIONARIO' } as AuthRequest
        const res = criarResMock()

        requireRole('ADMIN', 'FUNCIONARIO')(req, res, next)

        expect(next).toHaveBeenCalledOnce()
    })
})
