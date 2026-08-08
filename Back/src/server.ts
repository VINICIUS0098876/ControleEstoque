import router from './routes.js'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { errorMiddleware } from './middlewares/errorMiddleware.js'
import { httpLogger } from './middlewares/httpLogger.js'
import { env } from './conf/env.js'
import prismaClient from './conf/prisma.js'


const app = express()
app.use(helmet())
const port = env.PORT ? Number(env.PORT) : 3000

// Sem autenticação e antes do rate limiter de propósito: monitoramento externo
// (uptime checker, orquestrador de deploy) precisa bater aqui livremente, com
// frequência, sem depender de credenciais nem esbarrar em 429.
app.get('/health', async (_req, res) => {
    try {
        await prismaClient.$queryRaw`SELECT 1`
        return res.status(200).json({ status: 'ok' })
    } catch {
        return res.status(503).json({ status: 'unavailable' })
    }
})

const defaultDevOrigins = ['http://localhost:5173', 'http://localhost:5174']
const allowedOrigins = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : defaultDevOrigins

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
             callback(new Error('Acesso bloqueado pela política de CORS. Origem não autorizada.'))
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Muitas requisições deste IP. Por favor, tente novamente em 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(generalLimiter)

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: env.AUTH_RATE_LIMIT_MAX ? Number(env.AUTH_RATE_LIMIT_MAX) : 10,
    message: 'Muitas tentativas de autenticação. Por favor, tente novamente em 1 hora.'
})
app.use('/user/login', authLimiter)

app.use(httpLogger)

app.use(express.json())
app.use(cookieParser())

app.use(router)

app.use(errorMiddleware)

if(env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`)
    })
}

export default app