import { z } from "zod";

export const createVendaSchema = z.object({
    body: z.object({
        formaPagamento: z.enum(['DINHEIRO', 'PIX', 'CARTAO', 'FIADO'], {
            message: "A forma de pagamento deve ser DINHEIRO, PIX, CARTAO ou FIADO."
        }),
        clienteId: z.string().uuid({ message: "O id do cliente é inválido." }).optional(),
        itens: z
            .array(
                z.object({
                    produtoId: z.string().uuid({ message: "O id do produto é inválido." }),
                    quantidade: z
                        .number({ message: "A quantidade é obrigatória e deve ser um número." })
                        .int({ message: "A quantidade deve ser um número inteiro." })
                        .positive({ message: "A quantidade deve ser maior que zero." }),
                })
            )
            .min(1, { message: "A venda precisa ter pelo menos um item." }),
    }).superRefine((data, ctx) => {
        // Sem cliente identificado não há de quem cobrar depois — diferente de
        // DINHEIRO/PIX/CARTAO, onde o cliente é sempre opcional.
        if(data.formaPagamento === 'FIADO' && !data.clienteId){
            ctx.addIssue({
                code: 'custom',
                path: ['clienteId'],
                message: 'Selecione um cliente para registrar uma venda fiado.'
            })
        }
    })
});

export const vendaIdParamSchema = z.object({
    params: z.object({
        id: z.string().uuid({ message: "O id da venda é inválido." })
    })
});

export const listVendaQuerySchema = z.object({
    query: z.object({
        clienteId: z.string().uuid({ message: "O id do cliente é inválido." }).optional(),
        page: z.string().regex(/^\d+$/, { message: "page deve ser um número inteiro positivo." }).optional(),
        limit: z.string().regex(/^\d+$/, { message: "limit deve ser um número inteiro positivo." }).optional(),
    })
});
