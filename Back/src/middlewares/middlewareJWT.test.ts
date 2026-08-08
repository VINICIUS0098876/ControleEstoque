import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { TokenJWT } from './middlewareJWT.js'
import { env } from '../conf/env.js'

describe('TokenJWT.verifyTokenJWT', () => {
    beforeEach(() => {
        // O catch loga com console.error a cada token inválido — esperado nos testes
        // abaixo (é exatamente o que estamos exercitando), então silenciamos aqui pra
        // não poluir a saída do vitest.
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('retorna o payload decodificado para um token válido assinado em HS256', () => {
        const token = jwt.sign({ empresaId: 'empresa-1' }, env.SECRET_KEY, {
            subject: 'usuario-1',
            algorithm: 'HS256',
        })

        const decoded = TokenJWT.verifyTokenJWT(token)

        expect(decoded?.sub).toBe('usuario-1')
        expect(decoded?.empresaId).toBe('empresa-1')
    })

    it('rejeita um token assinado com um algoritmo diferente do restringido em jwt.verify', () => {
        // Mesmo com a mesma chave secreta, um token assinado em HS384 deve ser recusado —
        // é exatamente a proteção adicionada via jwt.verify(token, secret, { algorithms: ['HS256'] }).
        const token = jwt.sign({ empresaId: 'empresa-1' }, env.SECRET_KEY, {
            subject: 'usuario-1',
            algorithm: 'HS384',
        })

        expect(TokenJWT.verifyTokenJWT(token)).toBeNull()
    })

    it('rejeita um token expirado', () => {
        const token = jwt.sign({ empresaId: 'empresa-1' }, env.SECRET_KEY, {
            subject: 'usuario-1',
            expiresIn: -1,
        })

        expect(TokenJWT.verifyTokenJWT(token)).toBeNull()
    })

    it('rejeita um token assinado com uma chave secreta diferente', () => {
        const token = jwt.sign({ empresaId: 'empresa-1' }, 'chave-errada-0123456789012345678901', {
            subject: 'usuario-1',
        })

        expect(TokenJWT.verifyTokenJWT(token)).toBeNull()
    })

    it('rejeita um token sem "sub" no payload', () => {
        const token = jwt.sign({ empresaId: 'empresa-1' }, env.SECRET_KEY)

        expect(TokenJWT.verifyTokenJWT(token)).toBeNull()
    })
})
