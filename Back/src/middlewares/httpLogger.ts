import { randomUUID } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import type { Logger } from 'pino'
import { logger } from '../conf/logger.js'

// `Express.Request` é o ponto de extensão pensado pra isso (declarado como interface
// vazia em @types/express-serve-static-core exatamente para merge de tipos como este).
// Evitar `declare module "http"` — pacotes que aumentam os tipos crus do Node (em vez de
// Express.Request/Response) quebram a resolução de overload das rotas do Express em todo
// o projeto, por causa de como TypeScript compara os tipos de handler contra o union
// RequestHandler | ErrorRequestHandler.
declare global {
    namespace Express {
        interface Request {
            log: Logger
        }
    }
}

// Substitui o morgan: log estruturado (via pino) de cada requisição, com um id próprio
// pra correlacionar as linhas de entrada/saída da mesma requisição nos logs.
export function httpLogger(req: Request, res: Response, next: NextFunction) {
    req.log = logger.child({ requestId: randomUUID() })

    const startedAt = process.hrtime.bigint()
    req.log.info({ method: req.method, url: req.originalUrl }, 'request recebida')

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'

        req.log[level](
            { method: req.method, url: req.originalUrl, statusCode: res.statusCode, durationMs },
            'request finalizada'
        )
    })

    next()
}
