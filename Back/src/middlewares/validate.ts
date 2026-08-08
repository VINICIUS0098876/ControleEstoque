import type { Request, Response, NextFunction } from 'express';
import {z, ZodError } from 'zod';

export const validate = (schema: z.Schema) => {
    return async(req: Request, res: Response, next: NextFunction): Promise<any> => {
        try{
           // O schema recebido varia por rota, então seu shape de saída exato não é
           // conhecido aqui; o formato de entrada ({ body, query, params }) é sempre
           // esse, então tipamos a saída de acordo com ele.
           const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params
            }) as { body?: unknown, query?: unknown, params?: unknown }

            // Reatribui o resultado já validado/transformado pelo Zod (ex: .trim()),
            // em vez dos dados brutos originais, para que controllers e services
            // sempre recebam o mesmo dado que passou pela validação.
            if(parsed.body !== undefined) req.body = parsed.body
            if(parsed.params !== undefined) req.params = parsed.params as typeof req.params
            if(parsed.query !== undefined){
                // req.query é um getter somente-leitura definido pelo Express (recalculado
                // a partir da URL a cada acesso), então não pode ser reatribuído com "=".
                // Redefinir a propriedade na instância da requisição é a forma correta de
                // sobrepor esse getter com o resultado da validação.
                Object.defineProperty(req, 'query', {
                    value: parsed.query,
                    writable: true,
                    configurable: true,
                    enumerable: true,
                })
            }

            return next();
        }catch (error){
            if(error instanceof ZodError){
                return res.status(400).json({
                    status: 'error',
                    message: 'Dados de requisição inválidos',
                    errors: error.issues.map((err: any) => ({
                        field: err.path.slice(1).join('.'),
                        message: err.message
                    }))
                })
            }

            return res.status(500).json({status: 'error', message: 'Erro interno na validação dos dados'})
        }
    }
}