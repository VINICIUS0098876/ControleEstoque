import { z } from "zod";

const nome = z
    .string({ message: "O nome do cliente é obrigatório." })
    .min(2, { message: "O nome deve ter no mínimo 2 caracteres." })
    .max(150, { message: "O nome excedeu o limite de caracteres (150)." });

const telefone = z.string().max(20).trim().optional().or(z.literal(''));

const limiteCredito = z
    .number({ message: "O limite de crédito deve ser um número." })
    .nonnegative({ message: "O limite de crédito não pode ser negativo." })
    .optional();

export const createClienteSchema = z.object({
    body: z.object({
        nome,
        telefone,
        limiteCredito,
    })
});

export const updateClienteSchema = z.object({
    body: z.object({
        nome,
        telefone,
        limiteCredito,
    }),
    params: z.object({
        id: z.string().uuid({ message: "O id do cliente é inválido." })
    })
});

export const clienteIdParamSchema = z.object({
    params: z.object({
        id: z.string().uuid({ message: "O id do cliente é inválido." })
    })
});

export const listClienteQuerySchema = z.object({
    query: z.object({
        busca: z.string().trim().max(150).optional(),
        page: z.string().regex(/^\d+$/, { message: "page deve ser um número inteiro positivo." }).optional(),
        limit: z.string().regex(/^\d+$/, { message: "limit deve ser um número inteiro positivo." }).optional(),
        sortBy: z.enum(['nome', 'saldoDevedor']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
    })
});
