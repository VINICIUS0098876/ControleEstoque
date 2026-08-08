import pino from 'pino'
import { env } from './env.js'

const isProduction = env.NODE_ENV === 'production'

// Log estruturado (JSON) em produção — pronto para ir direto pra qualquer agregador de
// logs (Datadog, Grafana Loki, CloudWatch etc). Em desenvolvimento, formatado e colorido
// via pino-pretty para leitura humana no terminal.
//
// `exactOptionalPropertyTypes` não aceita `transport: undefined` explícito numa
// propriedade opcional — por isso a chave só é incluída via spread condicional,
// em vez de sempre presente com valor undefined.
export const logger = pino({
    level: isProduction ? 'info' : 'debug',
    ...(isProduction
        ? {}
        : {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname',
                },
            },
        }),
})
