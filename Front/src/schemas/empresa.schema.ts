import { z } from "zod"

export const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export const updateEmpresaSchema = z.object({
  nome: z
    .string()
    .min(2, "O nome deve ter no mínimo 2 caracteres.")
    .max(255, "O nome excedeu o limite de 255 caracteres."),
  cnpj: z
    .string()
    .trim()
    .regex(
      /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/,
      "Formato de CNPJ inválido. Use 00.000.000/0000-00 ou apenas números."
    ),
  logoUrl: z.string().url("A URL da logo deve ser válida.").optional().or(z.literal("")),
  temaCor: z
    .string()
    .regex(HEX_COLOR_PATTERN, "A cor deve ser um código HEX válido (ex: #0F4C81).")
    .optional()
    .or(z.literal("")),
})

export type UpdateEmpresaFormValues = z.infer<typeof updateEmpresaSchema>
