import jwt from 'jsonwebtoken'
import { env } from '../conf/env.js'

interface JwtPayloadWithUserId extends jwt.JwtPayload {
    sub: string,
    empresaId: string
}

export class TokenJWT {
    static verifyTokenJWT(token: string): JwtPayloadWithUserId | null {
        try {
            // Restringe explicitamente ao algoritmo usado em jwt.sign (usuario.ts) — sem isso,
            // a lib aceitaria qualquer algoritmo que o token alegar usar, incluindo um ataque
            // clássico de confusão de algoritmo (ex: RS256 verificado como se fosse HS256).
            const decoded = jwt.verify(token, env.SECRET_KEY, { algorithms: ['HS256'] }) as JwtPayloadWithUserId

            if (decoded && typeof decoded === 'object' && 'sub' in decoded) {
                return decoded
            }

            return null
        } catch (error) {
            console.error('Error verifying token:', error)
            return null
        }
    }
}
