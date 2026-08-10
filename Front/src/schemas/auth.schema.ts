import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().min(1, "O email é obrigatório.").email("Insira um e-mail válido."),
  senha: z.string().min(1, "A senha é obrigatória."),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "O email é obrigatório.").email("Insira um e-mail válido."),
})

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
    confirmarSenha: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não coincidem.",
    path: ["confirmarSenha"],
  })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export const cadastroEmpresaSchema = z.object({
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
  adminNome: z
    .string()
    .min(3, "O nome deve ter no mínimo 3 caracteres.")
    .max(150, "O nome excedeu o limite de 150 caracteres."),
  adminEmail: z.string().email("Insira um e-mail válido."),
  adminSenha: z
    .string()
    .min(6, "A senha deve ter no mínimo 6 caracteres.")
    .max(255, "A senha excedeu o limite de caracteres."),
})

export type CadastroEmpresaFormValues = z.infer<typeof cadastroEmpresaSchema>
