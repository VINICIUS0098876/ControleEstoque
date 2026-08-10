import { z } from "zod";

export const createPagamentoFiadoSchema = z.object({
    body: z.object({
        valor: z
            .number({ message: "O valor é obrigatório e deve ser um número." })
            .positive({ message: "O valor deve ser maior que zero." }),
    }),
    params: z.object({
        id: z.string().uuid({ message: "O id do cliente é inválido." })
    })
});
