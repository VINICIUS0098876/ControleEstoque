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

export interface ApiErrorResponse {
  message: string
  errors?: { field: string; message: string }[]
}
