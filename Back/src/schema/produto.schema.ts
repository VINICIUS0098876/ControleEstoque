import { z } from "zod";

const nome = z
    .string({ message: "O nome do produto é obrigatório." })
    .min(2, { message: "O nome deve ter no mínimo 2 caracteres." })
    .max(255, { message: "O nome excedeu o limite de caracteres (255)." });

const codigoBarras = z.string().max(100).trim().optional().or(z.literal(''));
const sku = z.string().max(100).trim().optional().or(z.literal(''));
const descricao = z.string().max(1000).optional().or(z.literal(''));
const unidadeMedida = z.string().max(10, { message: "A unidade de medida excedeu o limite de 10 caracteres." }).optional();
const precoCusto = z
    .number({ message: "O preço de custo é obrigatório e deve ser um número." })
    .nonnegative({ message: "O preço de custo não pode ser negativo." });
const precoVenda = z
    .number({ message: "O preço de venda é obrigatório e deve ser um número." })
    .nonnegative({ message: "O preço de venda não pode ser negativo." });
const estoqueMinimo = z
    .number({ message: "O estoque mínimo deve ser um número." })
    .int({ message: "O estoque mínimo deve ser um número inteiro." })
    .nonnegative({ message: "O estoque mínimo não pode ser negativo." })
    .optional();
const imagemUrl = z.string().url({ message: "A URL da imagem deve ser válida." }).optional().or(z.literal(''));
const categoriaId = z.string().uuid({ message: "O id da categoria é inválido." }).optional().or(z.literal(''));

export const createProdutoSchema = z.object({
    body: z.object({
        nome,
        codigoBarras,
        sku,
        descricao,
        unidadeMedida,
        precoCusto,
        precoVenda,
        // O estoque inicial pode ser informado na criação; depois disso, só muda via movimentação.
        quantidadeAtual: z
            .number({ message: "A quantidade atual deve ser um número." })
            .int({ message: "A quantidade atual deve ser um número inteiro." })
            .nonnegative({ message: "A quantidade atual não pode ser negativa." })
            .optional(),
        estoqueMinimo,
        imagemUrl,
        categoriaId,
    })
});

export const updateProdutoSchema = z.object({
    body: z.object({
        nome,
        codigoBarras,
        sku,
        descricao,
        unidadeMedida,
        precoCusto,
        precoVenda,
        estoqueMinimo,
        imagemUrl,
        categoriaId,
    }),
    params: z.object({
        id: z.string().uuid({ message: "O id do produto é inválido." })
    })
});

export const produtoIdParamSchema = z.object({
    params: z.object({
        id: z.string().uuid({ message: "O id do produto é inválido." })
    })
});

export const listProdutoQuerySchema = z.object({
    query: z.object({
        nome: z.string().trim().max(255).optional(),
        categoriaId: z.string().uuid({ message: "O id da categoria é inválido." }).optional(),
        estoqueBaixo: z.enum(['true', 'false']).optional(),
        page: z.string().regex(/^\d+$/, { message: "page deve ser um número inteiro positivo." }).optional(),
        limit: z.string().regex(/^\d+$/, { message: "limit deve ser um número inteiro positivo." }).optional(),
        sortBy: z.enum(['nome', 'precoVenda', 'quantidadeAtual', 'criadoEm']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
    })
});
