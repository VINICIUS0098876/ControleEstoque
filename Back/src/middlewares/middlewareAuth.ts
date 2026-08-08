import type {Request, Response, NextFunction} from 'express'
import type { Papel } from '@prisma/client'
import {TokenJWT} from './middlewareJWT.js'
import prismaClient from '../conf/prisma.js'
import { ERROR_FORBIDDEN } from '../utils/messages.js'

export interface AuthRequest extends Request{
    id?: string,
    empresaId?: string,
    papel?: Papel
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {

    const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1]

    if (!token) {
        return res.status(401).json({ message: 'Invalid token' })
    }

    try{
   const decoded = TokenJWT.verifyTokenJWT(token) as { sub: string, empresaId: string }

   const usuarioValido = await prismaClient.usuario.findUnique({
    where: {
        id: decoded.sub
    },
    include: {
        empresa: true
    }
   })

    if (!usuarioValido || !usuarioValido?.ativo || !usuarioValido.empresa.ativo) {
        return res.status(401).json({ message: 'Acesso negado. Conta inativa ou inexistente.' })
    }

    req.id = decoded.sub

    req.empresaId = decoded.empresaId

    // O papel vem do registro atual no banco (buscado acima), não do JWT: assim uma
    // mudança de papel feita por um admin passa a valer no próximo request, sem
    // esperar o access token antigo expirar.
    req.papel = usuarioValido.papel

    next()
    }catch (error) {
        return res.status(401).json({ message: ERROR_FORBIDDEN.message })
    }

 


}