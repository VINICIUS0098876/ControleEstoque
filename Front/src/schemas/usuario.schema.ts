import { z } from "zod"

export const createUsuarioSchema = z.object({
  nome: z
    .string()
    .min(3, "O nome deve ter no mínimo 3 caracteres.")
    .max(150, "O nome excedeu o limite de 150 caracteres."),
  email: z.string().email("Insira um e-mail válido."),
  senha: z
    .string()
    .min(6, "A senha deve ter no mínimo 6 caracteres.")
    .max(255, "A senha excedeu o limite de caracteres."),
})

export type CreateUsuarioFormValues = z.infer<typeof createUsuarioSchema>

export const editUsuarioSchema = z.object({
  nome: z
    .string()
    .min(3, "O nome deve ter no mínimo 3 caracteres.")
    .max(150, "O nome excedeu o limite de 150 caracteres."),
  email: z.string().email("Insira um e-mail válido."),
})

export type EditUsuarioFormValues = z.infer<typeof editUsuarioSchema>
