import { useState, type ReactNode } from "react"
import { Minus, PackageX, Plus, Search, ShoppingCart, Trash2, type LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/empty-state"
import { ProdutoImagem } from "@/components/produto-imagem"
import { useProdutos } from "@/hooks/use-produtos"
import { useCreateVenda } from "@/hooks/use-vendas"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatCurrency } from "@/lib/format"
import { ClienteFiadoPicker } from "@/pages/vendas/cliente-fiado-picker"
import type { Cliente, FormaPagamento, Produto } from "@/types"

interface ItemCarrinho {
  produtoId: string
  nome: string
  unidadeMedida: string
  precoVenda: number
  estoqueDisponivel: number
  quantidade: number
}

const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX", label: "Pix" },
  { value: "CARTAO", label: "Cartão" },
  { value: "FIADO", label: "Fiado" },
]

// Mesma linguagem visual do EmptyState (ícone num círculo + texto centralizado) para os
// dois estados sem resultado da busca do PDV — CommandEmpty por padrão só centraliza
// texto corrido, sem ícone; aqui ela também cuida de preencher e centralizar dentro da
// altura fixa do CommandList (ver className abaixo), em vez de depender de padding.
function BuscaEmptyState({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <CommandEmpty className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{children}</p>
    </CommandEmpty>
  )
}

export function PdvPage() {
  useDocumentTitle("PDV")

  const [busca, setBusca] = useState("")
  const buscaDebounced = useDebouncedValue(busca, 250)
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("DINHEIRO")
  const [clienteFiado, setClienteFiado] = useState<Cliente | null>(null)

  // limit maior que o normal da tela de Produtos: aqui é uma lista de seleção rápida
  // durante uma venda, não uma tabela paginada — vale mostrar mais opções de uma vez.
  const { data, isLoading } = useProdutos(
    { busca: buscaDebounced, limit: 8 },
    { enabled: buscaDebounced.length > 0 }
  )
  const createVenda = useCreateVenda()

  function adicionarAoCarrinho(produto: Produto) {
    if (produto.quantidadeAtual <= 0) {
      toast.error(`"${produto.nome}" está sem estoque.`)
      return
    }

    setCarrinho((atual) => {
      const existente = atual.find((item) => item.produtoId === produto.id)
      if (existente) {
        if (existente.quantidade >= produto.quantidadeAtual) {
          toast.error(`Estoque disponível de "${produto.nome}" já está todo no carrinho.`)
          return atual
        }
        return atual.map((item) =>
          item.produtoId === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
        )
      }
      return [
        ...atual,
        {
          produtoId: produto.id,
          nome: produto.nome,
          unidadeMedida: produto.unidadeMedida,
          precoVenda: Number(produto.precoVenda),
          estoqueDisponivel: produto.quantidadeAtual,
          quantidade: 1,
        },
      ]
    })
    // Limpa a busca a cada item adicionado — deixa o campo pronto pro próximo produto,
    // seja o operador digitando de novo ou o leitor de código de barras escaneando em
    // sequência (ambos "digitam" no mesmo campo, só a velocidade muda).
    setBusca("")
  }

  // Decrementar até chegar a zero remove o item do carrinho — evita um segundo controle
  // ("remover") disputando espaço com o de quantidade nas telas menores; o botão de
  // lixeira continua existindo à parte para remoção direta, sem passar pelo decremento.
  function alterarQuantidade(produtoId: string, delta: number) {
    setCarrinho((atual) =>
      atual.flatMap((item) => {
        if (item.produtoId !== produtoId) return [item]

        const novaQuantidade = item.quantidade + delta
        if (novaQuantidade <= 0) return []

        if (novaQuantidade > item.estoqueDisponivel) {
          toast.error(`Estoque disponível de "${item.nome}": ${item.estoqueDisponivel}.`)
          return [item]
        }

        return [{ ...item, quantidade: novaQuantidade }]
      })
    )
  }

  function removerDoCarrinho(produtoId: string) {
    setCarrinho((atual) => atual.filter((item) => item.produtoId !== produtoId))
  }

  const total = carrinho.reduce((acumulado, item) => acumulado + item.precoVenda * item.quantidade, 0)

  const fiadoSemCliente = formaPagamento === "FIADO" && !clienteFiado

  function finalizarVenda() {
    createVenda.mutate(
      {
        formaPagamento,
        clienteId: formaPagamento === "FIADO" ? clienteFiado?.id : undefined,
        itens: carrinho.map((item) => ({ produtoId: item.produtoId, quantidade: item.quantidade })),
      },
      {
        onSuccess: () => {
          setCarrinho([])
          setFormaPagamento("DINHEIRO")
          setClienteFiado(null)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">PDV</h1>
        <p className="text-sm text-muted-foreground">
          Busque por nome, SKU ou escaneie o código de barras do produto.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden p-0">
          {/* shouldFilter=false: a busca já é feita no servidor (nome/SKU/código de barras,
              ver useProdutos), o cmdk só cuida de destacar/navegar pelos resultados que já
              chegaram — inclusive Enter selecionar o item destacado nativamente, o que faz
              tanto "digitar nome e apertar Enter" quanto o fluxo de leitor de código de
              barras (que só "digita" rápido e manda Enter) funcionarem sem código especial. */}
          <Command shouldFilter={false} className="rounded-none">
            <CommandInput
              autoFocus
              placeholder="Nome, SKU ou código de barras..."
              value={busca}
              onValueChange={setBusca}
            />
            <CommandList className="max-h-[28rem] min-h-[28rem]">
              {!buscaDebounced && (
                <BuscaEmptyState icon={Search}>
                  Digite para buscar ou escaneie o código de barras do produto.
                </BuscaEmptyState>
              )}

              {buscaDebounced && isLoading && (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              )}

              {buscaDebounced && !isLoading && data?.produtos.length === 0 && (
                <BuscaEmptyState icon={PackageX}>Nenhum produto encontrado.</BuscaEmptyState>
              )}

              {buscaDebounced && !isLoading && data && data.produtos.length > 0 && (
                <CommandGroup heading="Produtos">
                  {data.produtos.map((produto) => {
                    const semEstoque = produto.quantidadeAtual <= 0
                    return (
                      <CommandItem
                        key={produto.id}
                        value={produto.id}
                        disabled={semEstoque}
                        onSelect={() => adicionarAoCarrinho(produto)}
                        className="gap-3 py-2.5"
                      >
                        <ProdutoImagem src={produto.imagemUrl} alt="" className="size-9" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{produto.nome}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[produto.sku && `SKU ${produto.sku}`, produto.codigoBarras]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                        </div>
                        {semEstoque ? (
                          <span className="shrink-0 text-xs font-medium text-destructive">Sem estoque</span>
                        ) : (
                          <span className="shrink-0 text-sm font-medium">{formatCurrency(produto.precoVenda)}</span>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </Card>

        <Card className="flex h-fit flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="size-4" />
              Carrinho
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {carrinho.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="Carrinho vazio"
                description="Busque um produto ao lado para adicionar à venda."
              />
            ) : (
              <ul className="space-y-3">
                {carrinho.map((item) => (
                  <li key={item.produtoId} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.precoVenda)} / {item.unidadeMedida}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        onClick={() => alterarQuantidade(item.produtoId, -1)}
                        aria-label={`Diminuir quantidade de ${item.nome}`}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="min-w-6 text-center text-sm tabular-nums">{item.quantidade}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        onClick={() => alterarQuantidade(item.produtoId, 1)}
                        disabled={item.quantidade >= item.estoqueDisponivel}
                        aria-label={`Aumentar quantidade de ${item.nome}`}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    {/* min-w em vez de w fixo: "R$ 8,50" e "R$ 9.000,00" têm larguras bem
                        diferentes — uma largura fixa cortava/sobrepunha o botão de excluir
                        quando o valor era maior (ex: produto caro, quantidade alta). */}
                    <p className="min-w-16 shrink-0 text-right text-sm font-medium whitespace-nowrap">
                      {formatCurrency(item.precoVenda * item.quantidade)}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removerDoCarrinho(item.produtoId)}
                      aria-label={`Remover ${item.nome} do carrinho`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-auto space-y-3 border-t pt-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>

              <Select value={formaPagamento} onValueChange={(value) => setFormaPagamento(value as FormaPagamento)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map((forma) => (
                    <SelectItem key={forma.value} value={forma.value}>
                      {forma.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {formaPagamento === "FIADO" && (
                <ClienteFiadoPicker clienteSelecionado={clienteFiado} onSelecionar={setClienteFiado} />
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={carrinho.length === 0 || fiadoSemCliente || createVenda.isPending}
                onClick={finalizarVenda}
              >
                {createVenda.isPending ? "Finalizando..." : "Finalizar venda"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
