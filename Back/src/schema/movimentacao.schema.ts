import { z } from "zod";

export const createMovimentacaoSchema = z.object({
    body: z.object({
        tipo: z.enum(['ENTRADA', 'SAIDA', 'ESTORNO'], { message: "O tipo deve ser ENTRADA, SAIDA ou ESTORNO." }),
        quantidade: z
            .number({ message: "A quantidade é obrigatória e deve ser um número." })
            .int({ message: "A quantidade deve ser um número inteiro." })
            .positive({ message: "A quantidade deve ser maior que zero." }),
        motivo: z.string().max(255).optional().or(z.literal('')),
    }),
    params: z.object({
        id: z.string().uuid({ message: "O id do produto é inválido." })
    })
});
