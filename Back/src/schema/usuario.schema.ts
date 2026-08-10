import { z } from "zod";

export const createUserSchema = z.object({
    body: z.object({
    nome: z
    .string({ message: "O nome é obrigatório." })
    .min(3, { message: "O nome deve ter no mínimo 3 caracteres." })
    .max(150, { message: "O nome excedeu o limite de caracteres (150 caracteres)." }),

    email: z
    .string({ message: "O email é obrigatório." })
    .email({ message: "Insira um formato de e-mail válido." }),

    senha: z
    .string({ message: "A senha é obrigatória." })
    .min(6, { message: "A senha deve ter no mínimo 6 caracteres." })
    .max(255, { message: "A senha excedeu o limite de caracteres." }),
    })
});

export const usuarioIdParamSchema = z.object({
    params: z.object({
        id: z.string().uuid({ message: "O id do usuário é inválido." })
    })
});

export const updateUsuarioSchema = z.object({
    body: z.object({
        nome: z
        .string({ message: "O nome é obrigatório." })
        .min(3, { message: "O nome deve ter no mínimo 3 caracteres." })
        .max(150, { message: "O nome excedeu o limite de caracteres (150 caracteres)." }),

        email: z
        .string({ message: "O email é obrigatório." })
        .email({ message: "Insira um formato de e-mail válido." }),
    })
});

export const adminUpdateUsuarioSchema = z.object({
    body: z.object({
        nome: z
        .string({ message: "O nome é obrigatório." })
        .min(3, { message: "O nome deve ter no mínimo 3 caracteres." })
        .max(150, { message: "O nome excedeu o limite de caracteres (150 caracteres)." }),

        email: z
        .string({ message: "O email é obrigatório." })
        .email({ message: "Insira um formato de e-mail válido." }),
    }),
    params: z.object({
        id: z.string().uuid({ message: "O id do usuário é inválido." })
    })
});

export const patchPasswordSchema = z.object({
    body: z.object({
        senhaAntiga: z
        .string({ message: "A senha atual é obrigatória." })
        .min(1, { message: "A senha atual é obrigatória." }),

        senha: z
        .string({ message: "A nova senha é obrigatória." })
        .min(6, { message: "A senha deve ter no mínimo 6 caracteres." })
        .max(255, { message: "A senha excedeu o limite de caracteres." }),
    })
});

export const loginUsuarioSchema = z.object({
    body: z.object({
        email: z
        .string({ message: "O email é obrigatório." })
        .email({ message: "Insira um formato de e-mail válido." }),

        senha: z
        .string({ message: "A senha é obrigatória." })
        .min(1, { message: "A senha é obrigatória." }),
    })
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z
        .string({ message: "O email é obrigatório." })
        .email({ message: "Insira um formato de e-mail válido." }),
    })
});

export const resetPasswordSchema = z.object({
    body: z.object({
        token: z
        .string({ message: "O token de redefinição é obrigatório." })
        .min(1, { message: "O token de redefinição é obrigatório." }),

        senha: z
        .string({ message: "A nova senha é obrigatória." })
        .min(6, { message: "A senha deve ter no mínimo 6 caracteres." })
        .max(255, { message: "A senha excedeu o limite de caracteres." }),
    })
});