import { z } from "zod";

export const createEmpresaSchema = z.object({
    body: z.object({
        nome: z
            .string({ message: "O nome da empresa é obrigatório." })
            .min(2, { message: "O nome deve ter no mínimo 2 caracteres." })
            .max(255, { message: "O nome excedeu o limite de caracteres (255)." }), // Boa prática: limite máximo do banco

        cnpj: z
            .string({ message: "O CNPJ é obrigatório." })
            // Remove espaços em branco do início e do fim
            .trim()
            // Aceita CNPJ com ou sem máscara (ex: 12.345.678/0001-90 ou 12345678000190)
            .regex(
                /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/,
                { message: "Formato de CNPJ inválido. Use 00.000.000/0000-00 ou apenas números." }
            ),

        // Como no Service você colocou logoUrl e temaCor como opcionais,
        // é importante avisar o Zod que eles podem vir na requisição,
        // senão o Zod (dependendo de como o middleware foi feito) pode barrar a requisição.
        logoUrl: z.string().url({ message: "A URL da logo deve ser válida." }).optional().or(z.literal('')),

        temaCor: z
            .string()
            .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: "O temaCor deve ser um código HEX válido (ex: #FFFFFF)." })
            .optional().or(z.literal('')),

        // O primeiro usuário ADMIN é criado junto com a empresa, na mesma transação,
        // para nunca existir uma empresa "sem dono" que outra pessoa possa reivindicar.
        adminNome: z
            .string({ message: "O nome do administrador é obrigatório." })
            .min(3, { message: "O nome deve ter no mínimo 3 caracteres." })
            .max(150, { message: "O nome excedeu o limite de caracteres (150 caracteres)." }),

        adminEmail: z
            .string({ message: "O email do administrador é obrigatório." })
            .email({ message: "Insira um formato de e-mail válido." }),

        adminSenha: z
            .string({ message: "A senha é obrigatória." })
            .min(6, { message: "A senha deve ter no mínimo 6 caracteres." })
            .max(255, { message: "A senha excedeu o limite de caracteres." }),
    })
});

export const updateEmpresaSchema = z.object({
    body: z.object({
        nome: z
            .string({ message: "O nome da empresa é obrigatório." })
            .min(2, { message: "O nome deve ter no mínimo 2 caracteres." })
            .max(255, { message: "O nome excedeu o limite de caracteres (255)." }),

        cnpj: z
            .string({ message: "O CNPJ é obrigatório." })
            .trim()
            .regex(
                /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/,
                { message: "Formato de CNPJ inválido. Use 00.000.000/0000-00 ou apenas números." }
            ),

        logoUrl: z.string().url({ message: "A URL da logo deve ser válida." }).optional().or(z.literal('')),

        temaCor: z
            .string()
            .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: "O temaCor deve ser um código HEX válido (ex: #FFFFFF)." })
            .optional().or(z.literal('')),
    })
});
