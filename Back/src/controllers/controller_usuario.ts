import type {Request, Response, NextFunction} from 'express'
import type { AuthRequest} from '../middlewares/middlewareAuth.js'
import {
LoginService,
CreateFuncionarioService,
UpdateUserService,
DeleteUserService,
GetUserService,
ListUsuarioService,
PatchPasswordService,
LogoutService,
DeactivateUserService,
ReactivateUserService,
RefreshTokenService,
AdminUpdateUsuarioService,
AdminResetPasswordService
} from '../services/usuario.js'
import {
  ERROR_UNAUTHENTICATED,
  SUCCESS_CREATED_ITEM,
  SUCCESS_DELETED_ITEM,
  SUCCESS_LOGIN_ITEM,
  SUCCESS_UPDATED_ITEM,
  SUCCESS_PASSWORD_RESET,
} from "../utils/messages.js";
import { setAuthCookies, clearAuthCookies } from '../utils/cookies.js'



export class CreateUsuarioController {
    async handle(req: AuthRequest, res: Response, next: NextFunction) {
        try{
            const {nome, email, senha} = req.body
            const empresaId = req.empresaId as string

            const createFuncionarioService = new CreateFuncionarioService()

            const usuario = await createFuncionarioService.execute({nome, email, senha, empresaId})

            return res.status(201).json({message: SUCCESS_CREATED_ITEM.message, usuario})
        } catch (error) {
            next(error)
        }
    }
}

export class UpdateUsuarioController {
    async handle(req: AuthRequest, res: Response, next: NextFunction) {
        try{
            const id = req.id as string
            const {nome, email} = req.body

            const updateUserService = new UpdateUserService()

            const usuario = await updateUserService.execute(id, {nome, email})

            return res.status(200).json({message: SUCCESS_UPDATED_ITEM.message, usuario})
        } catch (error) {
            next(error)
        }
    }
}

export class PatchPasswordController {
    async handle(req: AuthRequest, res: Response, next: NextFunction) {
        try{
            const id = req.id as string
            const {senha} = req.body

            const patchPasswordService = new PatchPasswordService()

            const usuario = await patchPasswordService.execute(id, senha, req.body.senhaAntiga)

            return res.status(200).json({message: SUCCESS_UPDATED_ITEM.message, usuario})
        } catch (error) {
            next(error)
        }
    }
}

export class DeleteUsuarioController {
    async handle(req: AuthRequest, res: Response, next: NextFunction) {
        try{
            const id = req.id as string

            const deleteUserService = new DeleteUserService()

            const usuario = await deleteUserService.execute(id)

            return res.status(200).json({message: SUCCESS_DELETED_ITEM.message, usuario})
        } catch (error) {
            next(error)
        }
    }
}

export class GetUsuarioController {
    async handle(req: AuthRequest, res: Response, next: NextFunction) {
        try{
            const id = req.id as string

            const getUserService = new GetUserService()

            const usuario = await getUserService.execute(id)

            return res.status(200).json({usuario})
        } catch (error) {
            next(error)
        }
    }
}

export class ListUsuarioController {
    async handle(req: AuthRequest, res: Response, next: NextFunction) {
        try{
            const empresaId = req.empresaId as string

            const listUsuarioService = new ListUsuarioService()

            const usuarios = await listUsuarioService.execute(empresaId)

            return res.status(200).json({usuarios})
        } catch (error) {
            next(error)
        }
    }
}

export class LoginUsuarioController {
    async handle(req: Request, res: Response, next: NextFunction) {
        try{
            const {email, senha} = req.body

            const loginService = new LoginService()

            const {usuario, accessToken, refreshToken} = await loginService.execute(email, senha)

            setAuthCookies(res, { accessToken, refreshToken })

            return res.status(200).json({message: SUCCESS_LOGIN_ITEM.message, usuario})
        } catch (error) {
            next(error)
        }
    }
}


export class LogoutUsuarioController {
    async handle(req: Request, res: Response, next: NextFunction) {
        try{
            const refreshTokenId = req.cookies?.refreshToken

            if(refreshTokenId){
                const logoutService = new LogoutService()
                await logoutService.execute(refreshTokenId)
            }

            // Logout é idempotente: se não havia sessão, o resultado desejado
            // (usuário deslogado, cookies limpos) já é o estado atual.
            clearAuthCookies(res)

            return res.status(200).json({message: SUCCESS_DELETED_ITEM.message})
        } catch (error) {
            next(error)
        }
    }
}

export class RefreshTokenController {
    async handle(req: Request, res: Response, next: NextFunction) {
        try{
            const refreshTokenTokenId = req.cookies?.refreshToken

            if(!refreshTokenTokenId){
                clearAuthCookies(res)
                return res.status(401).json({message: ERROR_UNAUTHENTICATED.message})
            }

            const refreshTokenService = new RefreshTokenService()

            const {accessToken, refreshToken} = await refreshTokenService.execute(refreshTokenTokenId)

            setAuthCookies(res, { accessToken, refreshToken })

            return res.status(200).json({message: SUCCESS_LOGIN_ITEM.message})
        } catch (error) {
            // Refresh token inválido/expirado: os cookies existentes não servem mais
            // pra nada, então limpa pra não deixar o front tentando restaurar essa
            // sessão morta a cada novo carregamento.
            clearAuthCookies(res)
            next(error)
        }
    }
}

export class DeactivateUsuarioController {
    async handle(req: AuthRequest, res: Response, next: NextFunction) {
        try{
            const id = req.params.id as string
            const empresaId = req.empresaId as string
            const idAutenticado = req.id as string

            const deactivateUserService = new DeactivateUserService()

            const usuario = await deactivateUserService.execute(id, empresaId, idAutenticado)

            return res.status(200).json({message: SUCCESS_UPDATED_ITEM.message, usuario})
        } catch (error) {
            next(error)
        }
    }
}

export class ReactivateUsuarioController {
    async handle(req: AuthRequest, res: Response, next: NextFunction) {
        try{
            const id = req.params.id as string
            const empresaId = req.empresaId as string

            const reactivateUserService = new ReactivateUserService()

            const usuario = await reactivateUserService.execute(id, empresaId)

            return res.status(200).json({message: SUCCESS_UPDATED_ITEM.message, usuario})
        } catch (error) {
            next(error)
        }
    }
}

export class AdminUpdateUsuarioController {
    async handle(req: AuthRequest, res: Response, next: NextFunction) {
        try{
            const id = req.params.id as string
            const empresaId = req.empresaId as string
            const {nome, email} = req.body

            const adminUpdateUsuarioService = new AdminUpdateUsuarioService()

            const usuario = await adminUpdateUsuarioService.execute(id, empresaId, {nome, email})

            return res.status(200).json({message: SUCCESS_UPDATED_ITEM.message, usuario})
        } catch (error) {
            next(error)
        }
    }
}

export class AdminResetPasswordController {
    async handle(req: AuthRequest, res: Response, next: NextFunction) {
        try{
            const id = req.params.id as string
            const empresaId = req.empresaId as string

            const adminResetPasswordService = new AdminResetPasswordService()

            const usuario = await adminResetPasswordService.execute(id, empresaId)

            return res.status(200).json({message: SUCCESS_PASSWORD_RESET.message, usuario})
        } catch (error) {
            next(error)
        }
    }
}
