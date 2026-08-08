import prismaClient from '../conf/prisma.js'
import * as bcrypt from 'bcryptjs'
import { Papel } from '@prisma/client'
import { AppError } from '../utils/AppError.js'
import { ERROR_NOT_FOUND } from '../utils/messages.js';


interface Empresa{
    nome: string;
    cnpj: string;
    logoUrl?: string;
    temaCor?: string;
    adminNome: string;
    adminEmail: string;
    adminSenha: string;
}

export class CreateEmpresaService{
    async execute({nome, cnpj, logoUrl, temaCor, adminNome, adminEmail, adminSenha}: Empresa){
        const empresaExistente = await prismaClient.empresa.findUnique({
            where: {
                cnpj: cnpj
            }
        })

        if(empresaExistente){
            throw new AppError("Empresa já cadastrada.", 409)
        }

        const usuarioExistente = await prismaClient.usuario.findUnique({
            where: {
                email: adminEmail
            }
        })

        if(usuarioExistente){
            throw new AppError("Conta já cadastrada", 409)
        }

        const senhaCriptografada = await bcrypt.hash(adminSenha, 10)

        // Empresa e primeiro usuário ADMIN são criados na mesma transação: nunca existe
        // uma janela em que a empresa esteja cadastrada sem dono para outra pessoa reivindicar.
        const empresa = await prismaClient.$transaction(async (tx) => {
            const empresaCriada = await tx.empresa.create({
                data: {
                    nome: nome,
                    cnpj: cnpj,
                    logoUrl: logoUrl ?? null,
                    temaCor: temaCor ?? null,
                }
            })

            await tx.usuario.create({
                data: {
                    nome: adminNome,
                    email: adminEmail,
                    senha: senhaCriptografada,
                    papel: Papel.ADMIN,
                    empresaId: empresaCriada.id
                }
            })

            return empresaCriada
        })

        return empresa
    }
}

export class UpdateEmpresaService{
    async execute(id: string, {nome, cnpj, logoUrl, temaCor}: Omit<Empresa, 'adminNome' | 'adminEmail' | 'adminSenha'>){
        const empresaExistente = await prismaClient.empresa.findFirst({
            where: {
                id: id,
                ativo: true
            }
        })

        if(!empresaExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        if(cnpj !== empresaExistente.cnpj){
            const empresaComMesmoCnpj = await prismaClient.empresa.findUnique({
                where: {
                    cnpj: cnpj
                }
            })

            if(empresaComMesmoCnpj){
                throw new AppError("Já existe uma empresa cadastrada com esse CNPJ.", 409)
            }
        }

        const empresa = await prismaClient.empresa.update({
            where: {
                id: id
            },
            data: {
                nome: nome,
                cnpj: cnpj,
                logoUrl: logoUrl ?? null,
                temaCor: temaCor ?? null,
            }
        })

        return empresa
    }
}

export class DeleteEmpresaService{
    async execute(id: string){
        const empresaExistente = await prismaClient.empresa.findFirst({
            where: {
                id: id,
                ativo: true
            }
        })

        if(!empresaExistente){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        const [, empresaDeletada] = await prismaClient.$transaction([

            prismaClient.usuario.updateMany({
                where: {
                    empresaId: id
                },
                data: {
                    ativo: false,
                    deletadoEm: new Date()
                }
            }),

            prismaClient.empresa.update({
                where: {
                    id: id
                },
                data: {
                    ativo: false,
                    deletadoEm: new Date(),
                    // Libera o CNPJ (único no banco) para que a mesma empresa possa se
                    // cadastrar de novo no futuro — sem isso, cancelar a assinatura
                    // bloquearia esse CNPJ para sempre, mesmo pro dono original.
                    cnpj: null
                },
                select: {
                    id: true,
                    nome: true,
                    cnpj: true,
                    ativo: true,
                    deletadoEm: true
                }
            })
        ])

        return empresaDeletada
    }
}

export class GetEmpresaService{
    async execute(id: string){
        const empresa = await prismaClient.empresa.findFirst({
            where: {
                id: id,
                ativo: true
            }
        })

        if(!empresa){
            throw new AppError(ERROR_NOT_FOUND.message, 404)
        }

        return empresa
    }
}
