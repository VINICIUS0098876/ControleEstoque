import prismaClient from '../conf/prisma.js'

const DIA_EM_MS = 24 * 60 * 60 * 1000

function formatarDataUTC(data: Date): string {
    return data.toISOString().slice(0, 10)
}

export interface ProdutoPorDia{
    data: string; // "YYYY-MM-DD"
    total: number;
}

interface ResumoEstoque{
    totalProdutos: number;
    valorCusto: number;
    valorVenda: number;
    tendenciaProdutos: ProdutoPorDia[];
}

interface ResumoEstoqueRow{
    totalProdutos: bigint;
    valorCusto: string | null;
    valorVenda: string | null;
}

const DIAS_TENDENCIA = 7

export class GetResumoEstoqueService{
    async execute(empresaId: string): Promise<ResumoEstoque>{
        // SUM(precoCusto * quantidadeAtual) não é representável no query builder do Prisma
        // (não há suporte a multiplicar duas colunas), então essa agregação é feita em SQL,
        // direto no banco — evita paginar e somar todos os produtos da empresa na aplicação.
        const [linha] = await prismaClient.$queryRaw<ResumoEstoqueRow[]>`
            SELECT
                COUNT(*)::bigint AS "totalProdutos",
                COALESCE(SUM("precoCusto" * "quantidadeAtual"), 0)::text AS "valorCusto",
                COALESCE(SUM("precoVenda" * "quantidadeAtual"), 0)::text AS "valorVenda"
            FROM "Produto"
            WHERE "empresaId" = ${empresaId}::uuid AND "ativo" = true
        `

        const tendenciaProdutos = await this.calcularTendenciaProdutos(empresaId)

        return {
            totalProdutos: Number(linha?.totalProdutos ?? 0n),
            valorCusto: Number(linha?.valorCusto ?? 0),
            valorVenda: Number(linha?.valorVenda ?? 0),
            tendenciaProdutos,
        }
    }

    // Contagem cumulativa de produtos ativos por dia, últimos DIAS_TENDENCIA dias — alimenta
    // o sparkline do card "Produtos cadastrados" no dashboard. Só considera produtos ainda
    // ativos hoje (mesma simplificação do restante deste service): um produto criado e depois
    // excluído não entra em nenhum dia da série, mesmo nos dias em que esteve ativo. Feito em
    // memória (não em SQL) de propósito — é só uma contagem sobre no máximo algumas centenas
    // de produtos por empresa, não compensa a complexidade de um generate_series aqui.
    private async calcularTendenciaProdutos(empresaId: string): Promise<ProdutoPorDia[]>{
        const produtos = await prismaClient.produto.findMany({
            where: { empresaId, ativo: true },
            select: { criadoEm: true }
        })

        const agora = new Date()
        const hojeUTC = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate())
        const desde = new Date(hojeUTC - (DIAS_TENDENCIA - 1) * DIA_EM_MS)

        const resultado: ProdutoPorDia[] = []
        for (let i = 0; i < DIAS_TENDENCIA; i++) {
            const fimDoDia = new Date(desde.getTime() + (i + 1) * DIA_EM_MS)
            const total = produtos.filter((produto) => produto.criadoEm < fimDoDia).length
            resultado.push({ data: formatarDataUTC(new Date(desde.getTime() + i * DIA_EM_MS)), total })
        }

        return resultado
    }
}

export interface MovimentacaoPorDia{
    data: string; // "YYYY-MM-DD"
    entradas: number;
    saidas: number;
}

interface MovimentacaoPorDiaRow{
    dia: Date;
    entradas: bigint;
    saidas: bigint;
}

export class GetMovimentacoesPorDiaService{
    async execute(empresaId: string, dias: number = 30): Promise<MovimentacaoPorDia[]>{
        const diasLimitados = Math.min(Math.max(Math.trunc(dias) || 30, 1), 90)

        // Janela em UTC (independente do fuso horário do processo Node): "hoje" truncado
        // para meia-noite UTC, menos (diasLimitados - 1) dias.
        const agora = new Date()
        const hojeUTC = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate())
        const desde = new Date(hojeUTC - (diasLimitados - 1) * DIA_EM_MS)

        // date_trunc('day', ...) trunca o timestamp armazenado (o Prisma grava em UTC),
        // então bate exatamente com a janela calculada acima em UTC.
        const linhas = await prismaClient.$queryRaw<MovimentacaoPorDiaRow[]>`
            SELECT
                date_trunc('day', "criadoEm") AS dia,
                SUM(CASE WHEN tipo IN ('ENTRADA', 'ESTORNO') THEN quantidade ELSE 0 END)::bigint AS entradas,
                SUM(CASE WHEN tipo = 'SAIDA' THEN quantidade ELSE 0 END)::bigint AS saidas
            FROM "Movimentacao"
            WHERE "empresaId" = ${empresaId}::uuid AND "criadoEm" >= ${desde}
            GROUP BY dia
        `

        const porDia = new Map(
            linhas.map((linha) => [
                formatarDataUTC(linha.dia),
                { entradas: Number(linha.entradas), saidas: Number(linha.saidas) }
            ])
        )

        // Preenche os dias sem nenhuma movimentação com zero, para o gráfico não ter buracos.
        const resultado: MovimentacaoPorDia[] = []
        for (let i = 0; i < diasLimitados; i++) {
            const dia = formatarDataUTC(new Date(desde.getTime() + i * DIA_EM_MS))
            const valores = porDia.get(dia)
            resultado.push({ data: dia, entradas: valores?.entradas ?? 0, saidas: valores?.saidas ?? 0 })
        }

        return resultado
    }
}

export interface FaturamentoPorDia{
    data: string; // "YYYY-MM-DD"
    total: number;
}

interface ResumoVendas{
    faturamentoHoje: number;
    quantidadeVendasHoje: number;
    tendenciaFaturamento: FaturamentoPorDia[];
}

interface ResumoVendasHojeRow{
    quantidadeVendas: bigint;
    faturamento: string | null;
}

const DIAS_TENDENCIA_VENDAS = 7

export class GetVendasResumoService{
    async execute(empresaId: string): Promise<ResumoVendas>{
        const agora = new Date()
        const hojeUTC = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()))

        const [linha] = await prismaClient.$queryRaw<ResumoVendasHojeRow[]>`
            SELECT
                COUNT(*)::bigint AS "quantidadeVendas",
                COALESCE(SUM("total"), 0)::text AS "faturamento"
            FROM "Venda"
            WHERE "empresaId" = ${empresaId}::uuid AND "criadoEm" >= ${hojeUTC}
        `

        const tendenciaFaturamento = await this.calcularTendenciaFaturamento(empresaId)

        return {
            faturamentoHoje: Number(linha?.faturamento ?? 0),
            quantidadeVendasHoje: Number(linha?.quantidadeVendas ?? 0n),
            tendenciaFaturamento,
        }
    }

    // Faturamento somado por dia, últimos DIAS_TENDENCIA_VENDAS dias — alimenta o
    // sparkline do card "Faturamento hoje" no dashboard, mesmo papel que
    // calcularTendenciaProdutos cumpre para o card de produtos cadastrados.
    private async calcularTendenciaFaturamento(empresaId: string): Promise<FaturamentoPorDia[]>{
        const agora = new Date()
        const hojeUTC = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate())
        const desde = new Date(hojeUTC - (DIAS_TENDENCIA_VENDAS - 1) * DIA_EM_MS)

        const linhas = await prismaClient.$queryRaw<{ dia: Date; total: string }[]>`
            SELECT date_trunc('day', "criadoEm") AS dia, COALESCE(SUM("total"), 0)::text AS total
            FROM "Venda"
            WHERE "empresaId" = ${empresaId}::uuid AND "criadoEm" >= ${desde}
            GROUP BY dia
        `

        const porDia = new Map(linhas.map((linha) => [formatarDataUTC(linha.dia), Number(linha.total)]))

        const resultado: FaturamentoPorDia[] = []
        for(let i = 0; i < DIAS_TENDENCIA_VENDAS; i++){
            const dia = formatarDataUTC(new Date(desde.getTime() + i * DIA_EM_MS))
            resultado.push({ data: dia, total: porDia.get(dia) ?? 0 })
        }

        return resultado
    }
}

export interface VendaPorDia{
    data: string; // "YYYY-MM-DD"
    total: number;
    quantidade: number;
}

interface VendaPorDiaRow{
    dia: Date;
    total: string;
    quantidade: bigint;
}

export class GetVendasPorDiaService{
    async execute(empresaId: string, dias: number = 30): Promise<VendaPorDia[]>{
        const diasLimitados = Math.min(Math.max(Math.trunc(dias) || 30, 1), 90)

        const agora = new Date()
        const hojeUTC = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate())
        const desde = new Date(hojeUTC - (diasLimitados - 1) * DIA_EM_MS)

        const linhas = await prismaClient.$queryRaw<VendaPorDiaRow[]>`
            SELECT
                date_trunc('day', "criadoEm") AS dia,
                COALESCE(SUM("total"), 0)::text AS total,
                COUNT(*)::bigint AS quantidade
            FROM "Venda"
            WHERE "empresaId" = ${empresaId}::uuid AND "criadoEm" >= ${desde}
            GROUP BY dia
        `

        const porDia = new Map(
            linhas.map((linha) => [
                formatarDataUTC(linha.dia),
                { total: Number(linha.total), quantidade: Number(linha.quantidade) }
            ])
        )

        // Preenche os dias sem nenhuma venda com zero, para o gráfico não ter buracos.
        const resultado: VendaPorDia[] = []
        for(let i = 0; i < diasLimitados; i++){
            const dia = formatarDataUTC(new Date(desde.getTime() + i * DIA_EM_MS))
            const valores = porDia.get(dia)
            resultado.push({ data: dia, total: valores?.total ?? 0, quantidade: valores?.quantidade ?? 0 })
        }

        return resultado
    }
}

export interface ProdutoMaisVendido{
    produtoId: string;
    nome: string;
    unidadeMedida: string;
    quantidadeVendida: number;
    faturamento: number;
}

export class GetProdutosMaisVendidosService{
    async execute(empresaId: string, dias: number = 30, limit: number = 5): Promise<ProdutoMaisVendido[]>{
        const diasLimitados = Math.min(Math.max(Math.trunc(dias) || 30, 1), 90)
        const limitLimitado = Math.min(Math.max(Math.trunc(limit) || 5, 1), 20)

        const agora = new Date()
        const hojeUTC = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate())
        const desde = new Date(hojeUTC - (diasLimitados - 1) * DIA_EM_MS)

        // Soma de quantidade por produto e ordenação: o Prisma faz isso nativamente via
        // groupBy, sem precisar de SQL bruto (diferente do restante deste arquivo, onde o
        // agrupamento por dia/multiplicação de colunas exige SQL).
        const agrupado = await prismaClient.itemVenda.groupBy({
            by: ['produtoId'],
            where: {
                venda: { empresaId, criadoEm: { gte: desde } }
            },
            _sum: { quantidade: true },
            orderBy: { _sum: { quantidade: 'desc' } },
            take: limitLimitado,
        })

        if(agrupado.length === 0) return []

        const produtoIds = agrupado.map((linha) => linha.produtoId)

        const [produtos, itens] = await Promise.all([
            // Sem filtro de `ativo`: um produto descontinuado depois de vendido continua
            // aparecendo no relatório com seu nome, não deveria sumir do histórico.
            prismaClient.produto.findMany({
                where: { id: { in: produtoIds } },
                select: { id: true, nome: true, unidadeMedida: true }
            }),
            // O faturamento por produto (quantidade * precoUnitario, somado por item) não é
            // representável no _sum do groupBy acima (não multiplica duas colunas), então é
            // calculado aqui a partir dos mesmos itens já filtrados pelo período/empresa.
            prismaClient.itemVenda.findMany({
                where: {
                    produtoId: { in: produtoIds },
                    venda: { empresaId, criadoEm: { gte: desde } }
                },
                select: { produtoId: true, quantidade: true, precoUnitario: true }
            })
        ])

        const produtoPorId = new Map(produtos.map((produto) => [produto.id, produto]))
        const faturamentoPorProduto = new Map<string, number>()
        for(const item of itens){
            const atual = faturamentoPorProduto.get(item.produtoId) ?? 0
            faturamentoPorProduto.set(item.produtoId, atual + item.quantidade * Number(item.precoUnitario))
        }

        // produtoPorId sempre tem uma entrada para cada produtoId de `agrupado`: todo
        // ItemVenda referencia um Produto que existe (FK obrigatória, produto nunca é
        // apagado de verdade — só soft delete).
        return agrupado.map((linha) => {
            const produto = produtoPorId.get(linha.produtoId)!
            return {
                produtoId: linha.produtoId,
                nome: produto.nome,
                unidadeMedida: produto.unidadeMedida,
                quantidadeVendida: linha._sum.quantidade ?? 0,
                faturamento: faturamentoPorProduto.get(linha.produtoId) ?? 0,
            }
        })
    }
}

interface ResumoFiado{
    totalReceber: number;
}

export class GetFiadoResumoService{
    async execute(empresaId: string): Promise<ResumoFiado>{
        // Mesma conta de calcularSaldosDevedores (services/cliente.ts), mas somada direto
        // por empresa em vez de agrupada por cliente — aqui só o total agregado importa,
        // não é preciso saber o saldo de cada cliente individualmente.
        const [fiadoAgg, pagamentosAgg] = await Promise.all([
            prismaClient.venda.aggregate({
                where: { empresaId, formaPagamento: 'FIADO' },
                _sum: { total: true }
            }),
            prismaClient.pagamentoFiado.aggregate({
                where: { empresaId },
                _sum: { valor: true }
            })
        ])

        const totalReceber = Number(fiadoAgg._sum.total ?? 0) - Number(pagamentosAgg._sum.valor ?? 0)

        return { totalReceber }
    }
}
