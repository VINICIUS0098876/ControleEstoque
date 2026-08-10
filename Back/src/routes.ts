import {Router} from 'express'
import {CreateUsuarioController, UpdateUsuarioController, DeleteUsuarioController, GetUsuarioController, ListUsuarioController, PatchPasswordController, LoginUsuarioController, LogoutUsuarioController, RefreshTokenController, DeactivateUsuarioController, ReactivateUsuarioController, AdminUpdateUsuarioController, AdminResetPasswordController, ForgotPasswordController, ResetPasswordController} from './controllers/controller_usuario.js'
import {CreateEmpresaController, UpdateEmpresaController, DeleteEmpresaController, GetEmpresaController} from './controllers/controller_empresa.js'
import { validate } from './middlewares/validate.js'
import { createEmpresaSchema, updateEmpresaSchema } from './schema/empresa.schema.js'
import { createUserSchema, usuarioIdParamSchema, updateUsuarioSchema, adminUpdateUsuarioSchema, patchPasswordSchema, loginUsuarioSchema, forgotPasswordSchema, resetPasswordSchema } from './schema/usuario.schema.js'
import { authMiddleware } from './middlewares/middlewareAuth.js'
import { requireRole } from './middlewares/middlewareRole.js'
import { CreateCategoriaController, DeleteCategoriaController, GetCategoriaController, ListCategoriaController, UpdateCategoriaController } from './controllers/controller_categoria.js'
import { createCategoriaSchema, updateCategoriaSchema, categoriaIdParamSchema, listCategoriaQuerySchema } from './schema/categoria.schema.js'
import { CreateProdutoController, DeleteProdutoController, GetProdutoController, ListProdutoController, UpdateProdutoController } from './controllers/controller_produto.js'
import { createProdutoSchema, updateProdutoSchema, produtoIdParamSchema, listProdutoQuerySchema } from './schema/produto.schema.js'
import { CreateMovimentacaoController, ListMovimentacaoController } from './controllers/controller_movimentacao.js'
import { createMovimentacaoSchema } from './schema/movimentacao.schema.js'
import { CreateVendaController, ListVendaController, GetVendaController } from './controllers/controller_venda.js'
import { createVendaSchema, listVendaQuerySchema, vendaIdParamSchema } from './schema/venda.schema.js'
import { CreateClienteController, UpdateClienteController, DeleteClienteController, GetClienteController, ListClienteController } from './controllers/controller_cliente.js'
import { createClienteSchema, updateClienteSchema, clienteIdParamSchema, listClienteQuerySchema } from './schema/cliente.schema.js'
import { CreatePagamentoFiadoController, ListPagamentoFiadoController } from './controllers/controller_pagamento_fiado.js'
import { createPagamentoFiadoSchema } from './schema/pagamento-fiado.schema.js'
import { GetResumoEstoqueController, GetMovimentacoesPorDiaController, GetVendasResumoController, GetVendasPorDiaController, GetProdutosMaisVendidosController, GetFiadoResumoController } from './controllers/controller_dashboard.js'



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
const forgotPasswordController = new ForgotPasswordController()
const resetPasswordController = new ResetPasswordController()


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

const createVendaController = new CreateVendaController()
const listVendaController = new ListVendaController()
const getVendaController = new GetVendaController()

const createClienteController = new CreateClienteController()
const updateClienteController = new UpdateClienteController()
const deleteClienteController = new DeleteClienteController()
const getClienteController = new GetClienteController()
const listClienteController = new ListClienteController()

const createPagamentoFiadoController = new CreatePagamentoFiadoController()
const listPagamentoFiadoController = new ListPagamentoFiadoController()

const getResumoEstoqueController = new GetResumoEstoqueController()
const getMovimentacoesPorDiaController = new GetMovimentacoesPorDiaController()
const getVendasResumoController = new GetVendasResumoController()
const getVendasPorDiaController = new GetVendasPorDiaController()
const getProdutosMaisVendidosController = new GetProdutosMaisVendidosController()
const getFiadoResumoController = new GetFiadoResumoController()




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
// Autoatendimento para quem esqueceu a senha (sem estar autenticado, ao contrário de
// PATCH /user/password, que exige a senha antiga). Ambas sob o mesmo authLimiter do login
// (ver server.ts), pra não virarem um vetor de spam de e-mail nem de força bruta de token.
router.post('/user/forgot-password', validate(forgotPasswordSchema), forgotPasswordController.handle)
router.post('/user/reset-password', validate(resetPasswordSchema), resetPasswordController.handle)
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

// Sem requireRole de propósito, igual produto/categoria: um FUNCIONARIO opera o PDV no
// dia a dia tanto quanto um ADMIN — a baixa de estoque de cada venda acontece dentro de
// CreateVendaService, na mesma transação que cria a venda (ver comentário lá).
router.post('/venda', authMiddleware, validate(createVendaSchema), createVendaController.handle)
router.get('/vendas', authMiddleware, validate(listVendaQuerySchema), listVendaController.handle)
router.get('/venda/:id', authMiddleware, validate(vendaIdParamSchema), getVendaController.handle)

// Sem requireRole, mesmo raciocínio de produto/categoria: FUNCIONARIO cadastra cliente e
// registra pagamento de fiado no dia a dia, sem depender de um ADMIN pra isso.
router.post('/cliente', authMiddleware, validate(createClienteSchema), createClienteController.handle)
router.put('/cliente/:id', authMiddleware, validate(updateClienteSchema), updateClienteController.handle)
router.delete('/cliente/:id', authMiddleware, validate(clienteIdParamSchema), deleteClienteController.handle)
router.get('/cliente/:id', authMiddleware, validate(clienteIdParamSchema), getClienteController.handle)
router.get('/clientes', authMiddleware, validate(listClienteQuerySchema), listClienteController.handle)

// Saldo devedor de fiado só muda via pagamento (histórico imutável, como Movimentacao).
router.post('/cliente/:id/pagamento', authMiddleware, validate(createPagamentoFiadoSchema), createPagamentoFiadoController.handle)
router.get('/cliente/:id/pagamentos', authMiddleware, validate(clienteIdParamSchema), listPagamentoFiadoController.handle)

router.get('/dashboard/resumo', authMiddleware, getResumoEstoqueController.handle)
router.get('/dashboard/movimentacoes-por-dia', authMiddleware, getMovimentacoesPorDiaController.handle)
router.get('/dashboard/vendas-resumo', authMiddleware, getVendasResumoController.handle)
router.get('/dashboard/vendas-por-dia', authMiddleware, getVendasPorDiaController.handle)
router.get('/dashboard/produtos-mais-vendidos', authMiddleware, getProdutosMaisVendidosController.handle)
router.get('/dashboard/fiado-resumo', authMiddleware, getFiadoResumoController.handle)

export default router
