import {Router} from 'express'
import {CreateUsuarioController, UpdateUsuarioController, DeleteUsuarioController, GetUsuarioController, ListUsuarioController, PatchPasswordController, LoginUsuarioController, LogoutUsuarioController, RefreshTokenController, DeactivateUsuarioController, ReactivateUsuarioController, AdminUpdateUsuarioController, AdminResetPasswordController} from './controllers/controller_usuario.js'
import {CreateEmpresaController, UpdateEmpresaController, DeleteEmpresaController, GetEmpresaController} from './controllers/controller_empresa.js'
import { validate } from './middlewares/validate.js'
import { createEmpresaSchema, updateEmpresaSchema } from './schema/empresa.schema.js'
import { createUserSchema, usuarioIdParamSchema, updateUsuarioSchema, adminUpdateUsuarioSchema, patchPasswordSchema, loginUsuarioSchema } from './schema/usuario.schema.js'
import { authMiddleware } from './middlewares/middlewareAuth.js'
import { requireRole } from './middlewares/middlewareRole.js'
import { CreateCategoriaController, DeleteCategoriaController, GetCategoriaController, ListCategoriaController, UpdateCategoriaController } from './controllers/controller_categoria.js'
import { createCategoriaSchema, updateCategoriaSchema, categoriaIdParamSchema, listCategoriaQuerySchema } from './schema/categoria.schema.js'
import { CreateProdutoController, DeleteProdutoController, GetProdutoController, ListProdutoController, UpdateProdutoController } from './controllers/controller_produto.js'
import { createProdutoSchema, updateProdutoSchema, produtoIdParamSchema, listProdutoQuerySchema } from './schema/produto.schema.js'
import { CreateMovimentacaoController, ListMovimentacaoController } from './controllers/controller_movimentacao.js'
import { createMovimentacaoSchema } from './schema/movimentacao.schema.js'
import { GetResumoEstoqueController, GetMovimentacoesPorDiaController } from './controllers/controller_dashboard.js'



const createUsuarioController = new CreateUsuarioController()
const updateUsuarioController = new UpdateUsuarioController()
const deleteUsuarioController = new DeleteUsuarioController()
const getUsuarioController = new GetUsuarioController()
const patchPasswordController = new PatchPasswordController()
const loginUsuarioController = new LoginUsuarioController()
const logoutUsuarioController = new LogoutUsuarioController()
const refreshTokenController = new RefreshTokenController()
const deactivateUsuarioController = new DeactivateUsuarioController()
const reactivateUsuarioController = new ReactivateUsuarioController()
const listUsuarioController = new ListUsuarioController()
const adminUpdateUsuarioController = new AdminUpdateUsuarioController()
const adminResetPasswordController = new AdminResetPasswordController()


const createEmpresaController = new CreateEmpresaController()
const updateEmpresaController = new UpdateEmpresaController()
const deleteEmpresaController = new DeleteEmpresaController()
const getEmpresaController = new GetEmpresaController()


const createCategoriaController = new CreateCategoriaController()
const updateCategoriaController = new UpdateCategoriaController()
const deleteCategoriaController = new DeleteCategoriaController()
const getCategoriaController = new GetCategoriaController()
const listCategoriasController = new ListCategoriaController()

const createProdutoController = new CreateProdutoController()
const updateProdutoController = new UpdateProdutoController()
const deleteProdutoController = new DeleteProdutoController()
const getProdutoController = new GetProdutoController()
const listProdutosController = new ListProdutoController()

const createMovimentacaoController = new CreateMovimentacaoController()
const listMovimentacaoController = new ListMovimentacaoController()

const getResumoEstoqueController = new GetResumoEstoqueController()
const getMovimentacoesPorDiaController = new GetMovimentacoesPorDiaController()




const router = Router()

// O primeiro usuário (ADMIN) é criado junto com a empresa (ver CreateEmpresaService).
// Esta rota cria os demais integrantes da equipe — sempre como FUNCIONARIO (ver
// CreateFuncionarioService) e sempre dentro da empresa de quem está autenticado, nunca
// a partir de dados do body — por isso é restrita a ADMIN.
router.post('/user', authMiddleware, requireRole('ADMIN'), validate(createUserSchema), createUsuarioController.handle)
router.put('/user', authMiddleware, validate(updateUsuarioSchema), updateUsuarioController.handle)
router.delete('/user', authMiddleware, deleteUsuarioController.handle)
router.get('/user', authMiddleware, getUsuarioController.handle)
// Lista os usuários da própria empresa: dados de colegas (inclui e-mail), restrito a ADMIN.
router.get('/users', authMiddleware, requireRole('ADMIN'), listUsuarioController.handle)
router.patch('/user/password', authMiddleware, validate(patchPasswordSchema), patchPasswordController.handle)
router.post('/user/login', validate(loginUsuarioSchema), loginUsuarioController.handle)
router.post('/user/logout', logoutUsuarioController.handle)
router.post('/user/refresh', refreshTokenController.handle)
router.patch('/user/:id/deactivate', authMiddleware, requireRole('ADMIN'), validate(usuarioIdParamSchema), deactivateUsuarioController.handle)
router.patch('/user/:id/reactivate', authMiddleware, requireRole('ADMIN'), validate(usuarioIdParamSchema), reactivateUsuarioController.handle)
// Edição de dados de outro usuário da própria empresa, restrita a ADMIN — distinta de
// PUT /user, que é o autoatendimento (edita quem está autenticado, via req.id do token).
router.put('/user/:id', authMiddleware, requireRole('ADMIN'), validate(adminUpdateUsuarioSchema), adminUpdateUsuarioController.handle)
// Gera uma nova senha provisória para um funcionário que esqueceu a senha (o
// autoatendimento em PATCH /user/password exige a senha antiga, que é exatamente
// o que falta nesse cenário). Restrita a ADMIN; a senha nova volta na resposta,
// pra ele repassar ao funcionário.
router.patch('/user/:id/reset-password', authMiddleware, requireRole('ADMIN'), validate(usuarioIdParamSchema), adminResetPasswordController.handle)


router.post('/empresa', validate(createEmpresaSchema), createEmpresaController.handle)
router.put('/empresa', authMiddleware, requireRole('ADMIN'), validate(updateEmpresaSchema), updateEmpresaController.handle)
router.delete('/empresa', authMiddleware, requireRole('ADMIN'), deleteEmpresaController.handle)
router.get('/empresa', authMiddleware, getEmpresaController.handle)


router.post('/categoria', authMiddleware, validate(createCategoriaSchema), createCategoriaController.handle)
router.put('/categoria/:id', authMiddleware, validate(updateCategoriaSchema), updateCategoriaController.handle)
router.delete('/categoria/:id', authMiddleware, validate(categoriaIdParamSchema), deleteCategoriaController.handle)
router.get('/categoria/:id', authMiddleware, validate(categoriaIdParamSchema), getCategoriaController.handle)
router.get('/categorias', authMiddleware, validate(listCategoriaQuerySchema), listCategoriasController.handle)


router.post('/produto', authMiddleware, validate(createProdutoSchema), createProdutoController.handle)
router.put('/produto/:id', authMiddleware, validate(updateProdutoSchema), updateProdutoController.handle)
router.delete('/produto/:id', authMiddleware, validate(produtoIdParamSchema), deleteProdutoController.handle)
router.get('/produto/:id', authMiddleware, validate(produtoIdParamSchema), getProdutoController.handle)
router.get('/produtos', authMiddleware, validate(listProdutoQuerySchema), listProdutosController.handle)

// Estoque só muda via movimentação (entrada/saída/estorno), para manter o histórico auditável.
router.post('/produto/:id/movimentacao', authMiddleware, validate(createMovimentacaoSchema), createMovimentacaoController.handle)
router.get('/produto/:id/movimentacoes', authMiddleware, validate(produtoIdParamSchema), listMovimentacaoController.handle)

router.get('/dashboard/resumo', authMiddleware, getResumoEstoqueController.handle)
router.get('/dashboard/movimentacoes-por-dia', authMiddleware, getMovimentacoesPorDiaController.handle)

export default router
