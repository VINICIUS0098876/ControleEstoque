import { z } from "zod"

export const produtoSchema = z.object({
  nome: z
    .string()
    .min(2, "O nome deve ter no mínimo 2 caracteres.")
    .max(255, "O nome excedeu o limite de 255 caracteres."),
  codigoBarras: z.string().max(100).trim().optional().or(z.literal("")),
  sku: z.string().max(100).trim().optional().or(z.literal("")),
  descricao: z.string().max(1000).optional().or(z.literal("")),
  unidadeMedida: z.string().max(10, "Máximo de 10 caracteres.").optional().or(z.literal("")),
  // Campo vazio chega aqui como `undefined`, não "" (ver campos numéricos em
  // produto-form-dialog.tsx) — sem valor, z.coerce.number() rejeita com essa mensagem
  // em vez de silenciosamente virar 0.
  precoCusto: z.coerce
    .number({ message: "O preço de custo é obrigatório e deve ser um número válido." })
    .nonnegative("O preço de custo não pode ser negativo."),
  precoVenda: z.coerce
    .number({ message: "O preço de venda é obrigatório e deve ser um número válido." })
    .nonnegative("O preço de venda não pode ser negativo."),
  quantidadeAtual: z.coerce
    .number()
    .int("Deve ser um número inteiro.")
    .nonnegative("Não pode ser negativo.")
    .optional(),
  estoqueMinimo: z.coerce
    .number()
    .int("Deve ser um número inteiro.")
    .nonnegative("Não pode ser negativo.")
    .optional(),
  imagemUrl: z.string().url("URL inválida.").optional().or(z.literal("")),
  categoriaId: z.string().optional().or(z.literal("")),
})

export type ProdutoFormValues = z.infer<typeof produtoSchema>

export const movimentacaoSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA", "ESTORNO"]),
  quantidade: z.coerce.number().int("Deve ser um número inteiro.").positive("Deve ser maior que zero."),
  motivo: z.string().max(255).optional().or(z.literal("")),
})

export type MovimentacaoFormValues = z.infer<typeof movimentacaoSchema>
