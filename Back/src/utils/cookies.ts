import type { Response } from 'express'
import { env } from '../conf/env.js'

const isProduction = env.NODE_ENV === 'production'

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000

// sameSite: 'strict' pressupõe que front e back ficam no mesmo domínio registrável em
// produção (subpath ou subdomínio atrás do mesmo proxy reverso). Se essa topologia mudar
// para domínios registráveis diferentes (ex: front na Vercel, back em outro provedor),
// os cookies passam a ser cross-site e o navegador para de enviá-los com 'strict' — nesse
// cenário seria necessário migrar para sameSite: 'none' (exige secure: true).
const baseCookieOptions = {
    secure: isProduction,
    sameSite: 'strict' as const,
}

interface AuthTokens {
    accessToken: string
    refreshToken: string
}

// O cookie `session_active` não é httpOnly de propósito: ele não carrega nenhum
// dado sensível nem é aceito pelo authMiddleware para autorizar nada, serve só
// para o front saber, sem round-trip ao servidor, se vale a pena tentar
// restaurar a sessão (evita chamadas a /user e /user/refresh já fadadas a 401).
export function setAuthCookies(res: Response, { accessToken, refreshToken }: AuthTokens) {
    res.cookie('accessToken', accessToken, {
        ...baseCookieOptions,
        httpOnly: true,
        maxAge: ACCESS_TOKEN_MAX_AGE,
    })

    res.cookie('refreshToken', refreshToken, {
        ...baseCookieOptions,
        httpOnly: true,
        maxAge: REFRESH_TOKEN_MAX_AGE,
    })

    res.cookie('session_active', '1', {
        ...baseCookieOptions,
        httpOnly: false,
        maxAge: REFRESH_TOKEN_MAX_AGE,
    })
}

export function clearAuthCookies(res: Response) {
    res.clearCookie('accessToken', { ...baseCookieOptions, httpOnly: true })
    res.clearCookie('refreshToken', { ...baseCookieOptions, httpOnly: true })
    res.clearCookie('session_active', { ...baseCookieOptions, httpOnly: false })
}
