export type Papel = "ADMIN" | "FUNCIONARIO"

export interface Usuario {
  id: string
  nome: string
  email: string
  papel: Papel
  empresaId?: string
  ativo?: boolean
  criadoEm?: string
}

export interface Empresa {
  id: string
  nome: string
  cnpj: string | null
  logoUrl: string | null
  temaCor: string | null
}

export interface Categoria {
  id: string
  nome: string
  empresaId?: string
  _count?: { produtos: number }
}

export interface Produto {
  id: string
  nome: string
  codigoBarras: string | null
  sku: string | null
  descricao: string | null
  unidadeMedida: string
  precoCusto: string
  precoVenda: string
  quantidadeAtual: number
  estoqueMinimo: number
  imagemUrl: string | null
  categoriaId: string | null
  categoria?: { nome: string } | null
  empresaId: string
  criadoEm: string
  atualizadoEm: string
  _count?: { movimentacoes: number }
}

export type ProdutoOrdenavel = "nome" | "precoVenda" | "quantidadeAtual" | "criadoEm"
export type OrdemClassificacao = "asc" | "desc"

export interface MovimentacaoPorDia {
  data: string
  entradas: number
  saidas: number
}

export type TipoMovimentacao = "ENTRADA" | "SAIDA" | "ESTORNO"

export interface Movimentacao {
  id: string
  tipo: TipoMovimentacao
  quantidade: number
  motivo: string | null
  produtoId: string
  empresaId: string
  usuarioId: string | null
  usuario?: { nome: string } | null
  criadoEm: string
}

export interface ProdutosResponse {
  produtos: Produto[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type FormaPagamento = "DINHEIRO" | "PIX" | "CARTAO" | "FIADO"

export interface ItemVenda {
  id: string
  quantidade: number
  precoUnitario: string
  produtoId: string
  produto?: { nome: string; sku: string | null; unidadeMedida: string } | null
}

export interface Venda {
  id: string
  formaPagamento: FormaPagamento
  total: string
  empresaId: string
  usuarioId: string
  usuario?: { nome: string } | null
  clienteId?: string | null
  cliente?: { nome: string; telefone: string | null } | null
  itens?: ItemVenda[]
  _count?: { itens: number }
  criadoEm: string
}

export interface VendasResponse {
  vendas: Venda[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface FaturamentoPorDia {
  data: string
  total: number
}

export interface ResumoVendas {
  faturamentoHoje: number
  quantidadeVendasHoje: number
  tendenciaFaturamento: FaturamentoPorDia[]
}

export interface VendaPorDia {
  data: string
  total: number
  quantidade: number
}

export interface ProdutoMaisVendido {
  produtoId: string
  nome: string
  unidadeMedida: string
  quantidadeVendida: number
  faturamento: number
}

export interface Cliente {
  id: string
  nome: string
  telefone: string | null
  limiteCredito: string | null
  saldoDevedor?: number
  empresaId?: string
  ativo?: boolean
  criadoEm?: string
}

export interface ClientesResponse {
  clientes: Cliente[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PagamentoFiado {
  id: string
  valor: string
  clienteId: string
  usuarioId: string
  usuario?: { nome: string } | null
  criadoEm: string
  saldoDevedor?: number
}

export interface ResumoFiado {
  totalReceber: number
}

export interface ApiErrorResponse {
  message: string
  errors?: { field: string; message: string }[]
}
