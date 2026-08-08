import type { Response, NextFunction } from 'express'
import type { Papel } from '@prisma/client'
import type { AuthRequest } from './middlewareAuth.js'
import { ERROR_FORBIDDEN } from '../utils/messages.js'

// Deve ser usado depois de authMiddleware, que é quem preenche req.papel.
export function requireRole(...papeisPermitidos: Papel[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.papel || !papeisPermitidos.includes(req.papel)) {
            return res.status(ERROR_FORBIDDEN.status_code).json({ message: ERROR_FORBIDDEN.message })
        }

        next()
    }
}
