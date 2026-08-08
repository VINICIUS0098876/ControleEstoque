import prismaClient from '../conf/prisma.js'
import * as bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken';
import crypto from 'crypto'
import { Papel } from '@prisma/client'
import { AppError } from '../utils/AppError.js'
import { ERROR_INVALID_CREDENTIALS, ERROR_NOT_FOUND, ERROR_REQUIRED_FIELDS } from '../utils/messages.js';
import { env } from '../conf/env.js'

interface UpdateUsuario{
    nome: string;
    email: string;
}

// Gera uma senha provisória aleatória para o reset feito pelo ADMIN (ver
// AdminResetPasswordService). base64url produz só caracteres alfanuméricos e -/_,
// então o resultado nunca esbarra na validação de senha do login/troca.
function gerarSenhaProvisoria(): string {
    return crypto.randomBytes(9).toString('base64url')
}

interface CreateFuncionario{
    nome: string;
    email: string;
    senha: string;
    empresaId: string;
}

// Hash bcrypt de uma senha arbitrária que nunca corresponde a nenhuma senha real.
// Usado só para gastar o mesmo tempo de um bcrypt.compare legítimo quando o e-mail
// informado no login não existe (ver LoginService), mitigando enumeração por timing.
const HASH_FANTASMA_TIMING_ATTACK = '$2b$10$/FXkVxxmQlNHreWn7ZufouVg760999uIej.mo6U/tfJmhkBEZbUVq'

export class CreateFuncionarioService{
    async execute({nome, email, senha, empresaId}: CreateFuncionario){
        const usuarioExistente = await prismaClient.usuario.findUnique({
            where: {
                email: email
            }
        })

        if(usuarioExistente){
            throw new AppError('Email já cadastrado', 409)
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10)

        // papel é sempre FUNCIONARIO aqui — de propósito, não vem do body. O único jeito
        // de existir um ADMIN é sendo o dono criado junto com a empresa (CreateEmpresaService).
        const usuario = await prismaClient.usuario.create({
            data: {
                nome: nome,
                email: email,
                senha: senhaCriptografada,
                papel: Papel.FUNCIONARIO,
                empresaId: empresaId
            },
            select: {
                id: true,
                nome: true,
                email: true,
                papel: true,
                ativo: true,
                criadoEm: true
            }
        })

        return usuario
    }
}

export class UpdateUserService{
    async execute(id: string, {nome, email}: UpdateUsuario){
        const usuarioExistente = await prismaClient.usuario.findFirst({
            where: {
                id: id,
                ativo: true
            }
        })

        if(!usuarioExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        if(email && email !== usuarioExistente.email){
            const emailExistente = await prismaClient.usuario.findUnique({
                where: {
                    email: email
                }
            })

            if(emailExistente){
                throw new AppError('Email já cadastrado', 409)
            }
        }

        const usuario = await prismaClient.usuario.update({
            where: {
                id: id
            },
            data: {
                nome: nome,
                email: email
            },
            select: {
                nome: true,
                email: true,
                papel: true
            }
        })

        return usuario
    }
}

export class PatchPasswordService{
    async execute(id: string, senha: string, senhaAntiga: string){
        const usuarioExistente = await prismaClient.usuario.findFirst({
            where: {
                id: id,
                ativo: true
            }
        })

        if(!usuarioExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const senhaValida = await bcrypt.compare(senhaAntiga, usuarioExistente.senha)

        if(!senhaValida){
            throw new AppError(ERROR_INVALID_CREDENTIALS.message, 401)
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10)

        const usuario = await prismaClient.usuario.update({
            where: {
                id: id
            },
            data: {
                senha: senhaCriptografada
            },
            select: {
                nome: true,
                email: true,
                papel: true
            }
        })

        return usuario
    }
}

export class DeleteUserService{
    async execute(id: string){
        const usuarioExistente = await prismaClient.usuario.findFirst({
            where: {
                id: id,
                ativo: true
            }
        })

        if(!usuarioExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const [, usuarioDeletado] = await prismaClient.$transaction([

            prismaClient.refreshToken.deleteMany({
                where: {
                    usuarioId: id
                }
            }),

            prismaClient.usuario.update({
                where: {
                    id: id
                },
                data: {
                    ativo: false,
                    deletadoEm: new Date()
                },
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    ativo: true,
                    deletadoEm: true
                }
            })
        ])

        return usuarioDeletado
    }
}

export class GetUserService{
    async execute(id: string){
        const usuario = await prismaClient.usuario.findFirst({
            where: {
                id: id,
                ativo: true
            },
            select: {
                id: true,
                nome: true,
                email: true,
                papel: true,
                empresaId: true,
                criadoEm: true
            }
        })

        if(!usuario){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        return usuario
    }
}

export class ListUsuarioService{
    async execute(empresaId: string){
        const usuarios = await prismaClient.usuario.findMany({
            where: {
                empresaId: empresaId
            },
            select: {
                id: true,
                nome: true,
                email: true,
                papel: true,
                ativo: true,
                criadoEm: true
            },
            orderBy: {
                nome: 'asc'
            }
        })

        return usuarios
    }
}

export class LoginService{
    async execute(email: string, senha: string){
        const usuarioExistente = await prismaClient.usuario.findFirst({
            where: {
                email: email,
                ativo: true
            }
        })

        // Mesmo quando o e-mail não existe, roda um bcrypt.compare contra um hash fixo
        // para gastar um tempo equivalente ao caminho de e-mail válido. Sem isso, a
        // resposta a um e-mail inexistente seria imediata e a de um e-mail existente
        // levaria o tempo do bcrypt, permitindo enumerar contas cadastradas por timing.
        const hashParaComparacao = usuarioExistente?.senha ?? HASH_FANTASMA_TIMING_ATTACK
        const senhaValida = await bcrypt.compare(senha, hashParaComparacao)

        if(!usuarioExistente || !senhaValida){
            throw new AppError(ERROR_INVALID_CREDENTIALS.message, 401)
        }

        const accessToken = jwt.sign(
            {empresaId: usuarioExistente.empresaId},
            env.SECRET_KEY,
            {
                subject: usuarioExistente.id,
                expiresIn: '15m'
            }
        )

        await prismaClient.refreshToken.deleteMany({
            where: {
                usuarioId: usuarioExistente.id
            }
        })

        const expiresIn = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)

        const refreshToken = await prismaClient.refreshToken.create({
            data: {
                usuarioId: usuarioExistente.id,
                expiresIn: expiresIn
            }
        })

        return {
            usuario: {
                id: usuarioExistente.id,
                nome: usuarioExistente.nome,
                email: usuarioExistente.email,
                papel: usuarioExistente.papel,
                empresaId: usuarioExistente.empresaId
            },
            accessToken: accessToken,
            refreshToken: refreshToken.id
        }
    }
}

export class LogoutService{
    async execute(refreshTokenId: string){
        if(!refreshTokenId){
            throw new AppError(ERROR_REQUIRED_FIELDS.message, 400)
        }

        await prismaClient.refreshToken.deleteMany({
            where: {
                id: refreshTokenId
            }
        })
    }
}

export class RefreshTokenService{
    async execute(refreshTokenId: string){
        if(!refreshTokenId){
            throw new AppError(ERROR_REQUIRED_FIELDS.message, 400)
        }

        const refreshToken = await prismaClient.refreshToken.findUnique({
            where: {
                id: refreshTokenId
            },
            include: {
                usuario: true
            }
        })

        if(!refreshToken){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        if(!refreshToken.usuario.ativo){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const tempoReal = Math.floor(Date.now() / 1000)

        if(refreshToken.expiresIn < tempoReal){
            await prismaClient.refreshToken.deleteMany({
                where: {
                    id: refreshTokenId
                }
            })

            throw new AppError('Refresh token expirado', 401)
        }

        const accessToken = jwt.sign(
            {empresaId: refreshToken.usuario.empresaId},
            env.SECRET_KEY,
            {
                subject: refreshToken.usuario.id,
                expiresIn: '15m'
            }
        )

        const novoExpiresIn = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)

        // Rotação: o refresh token usado é invalidado e substituído por um novo a
        // cada renovação. Assim, se um refresh token vazar, o reuso dele por outra
        // parte após o legítimo já ter renovado se torna, na prática, inofensivo
        // (o token vazado já não existe mais).
        const [, novoRefreshToken] = await prismaClient.$transaction([
            prismaClient.refreshToken.delete({
                where: {
                    id: refreshTokenId
                }
            }),
            prismaClient.refreshToken.create({
                data: {
                    usuarioId: refreshToken.usuario.id,
                    expiresIn: novoExpiresIn
                }
            })
        ])

        return {
            accessToken: accessToken,
            refreshToken: novoRefreshToken.id
        }
    }
}

export class DeactivateUserService{
    async execute(id: string, empresaId: string, idAutenticado: string){
        // Impede o ADMIN de se autodesativar por esta rota (ele ficaria sem acesso pra
        // reverter, já que não existe outro ADMIN pra fazer isso por ele). Desativar a
        // própria conta continua possível pelo fluxo de autoatendimento (DELETE /user).
        if(id === idAutenticado){
            throw new AppError('Você não pode desativar sua própria conta por aqui.', 400)
        }

        // Só desativa usuário ativo da mesma empresa de quem está autenticado, pra não
        // permitir desativar contas de outras empresas nem usuários já inativos.
        const usuarioExistente = await prismaClient.usuario.findFirst({
            where: {
                id: id,
                empresaId: empresaId,
                ativo: true
            }
        })

        if(!usuarioExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const [, usuarioDesativado] = await prismaClient.$transaction([
            prismaClient.refreshToken.deleteMany({
                where: {
                    usuarioId: id
                }
            }),
            prismaClient.usuario.update({
                where: {
                    id: id
                },
                data: {
                    ativo: false,
                    deletadoEm: new Date()
                },
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    ativo: true,
                }
            })
        ])

        return usuarioDesativado
    }
}

export class AdminUpdateUsuarioService{
    async execute(id: string, empresaId: string, {nome, email}: UpdateUsuario){
        // Escopado por empresa, ao contrário de UpdateUserService (autoatendimento, que
        // resolve o alvo pelo id do próprio token): aqui o alvo vem do :id da rota, então
        // sem esse filtro um ADMIN poderia editar usuário de outra empresa.
        const usuarioExistente = await prismaClient.usuario.findFirst({
            where: {
                id: id,
                empresaId: empresaId,
                ativo: true
            }
        })

        if(!usuarioExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        if(email && email !== usuarioExistente.email){
            const emailExistente = await prismaClient.usuario.findUnique({
                where: {
                    email: email
                }
            })

            if(emailExistente){
                throw new AppError('Email já cadastrado', 409)
            }
        }

        const usuario = await prismaClient.usuario.update({
            where: {
                id: id
            },
            data: {
                nome: nome,
                email: email
            },
            select: {
                id: true,
                nome: true,
                email: true,
                papel: true
            }
        })

        return usuario
    }
}

export class AdminResetPasswordService{
    async execute(id: string, empresaId: string){
        // Mesmo escopo de AdminUpdateUsuarioService: só alcança usuário ativo da própria empresa.
        const usuarioExistente = await prismaClient.usuario.findFirst({
            where: {
                id: id,
                empresaId: empresaId,
                ativo: true
            }
        })

        if(!usuarioExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const senhaProvisoria = gerarSenhaProvisoria()
        const senhaCriptografada = await bcrypt.hash(senhaProvisoria, 10)

        // Troca a senha e invalida as sessões ativas na mesma transação: quem estiver
        // logado com a senha antiga é deslogado, evitando que ela continue valendo por
        // uma sessão já aberta depois do reset.
        const [, usuario] = await prismaClient.$transaction([
            prismaClient.refreshToken.deleteMany({
                where: {
                    usuarioId: id
                }
            }),

            prismaClient.usuario.update({
                where: {
                    id: id
                },
                data: {
                    senha: senhaCriptografada
                },
                select: {
                    id: true,
                    nome: true,
                    email: true
                }
            })
        ])

        return { ...usuario, senhaProvisoria }
    }
}

export class ReactivateUserService{
    async execute(id: string, empresaId: string){
        // Só reativa usuário inativo da mesma empresa de quem está autenticado,
        // pra não permitir reativar contas de outras empresas nem usuários já ativos.
        const usuarioExistente = await prismaClient.usuario.findFirst({
            where: {
                id: id,
                empresaId: empresaId,
                ativo: false
            }
        })

        if(!usuarioExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const usuario = await prismaClient.usuario.update({
            where: {
                id: id
            },
            data: {
                ativo: true,
                deletadoEm: null
            },
            select: {
                id: true,
                nome: true,
                email: true,
                ativo: true,
            }
        })

        return usuario
    }
}
