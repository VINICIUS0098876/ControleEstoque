import { z } from "zod";

export const createCategoriaSchema = z.object({
    body: z.object({
        nome: z
            .string({ message: "O nome da categoria é obrigatório." })
            .min(2, { message: "O nome deve ter no mínimo 2 caracteres." })
            .max(150, { message: "O nome excedeu o limite de caracteres (150)." }),
    })
});

export const updateCategoriaSchema = z.object({
    body: z.object({
        nome: z
            .string({ message: "O nome da categoria é obrigatório." })
            .min(2, { message: "O nome deve ter no mínimo 2 caracteres." })
            .max(150, { message: "O nome excedeu o limite de caracteres (150)." }),
    }),
    params: z.object({
        id: z.string().uuid({ message: "O id da categoria é inválido." })
    })
});

export const categoriaIdParamSchema = z.object({
    params: z.object({
        id: z.string().uuid({ message: "O id da categoria é inválido." })
    })
});

export const listCategoriaQuerySchema = z.object({
    query: z.object({
        nome: z.string().trim().max(150).optional(),
    })
});
