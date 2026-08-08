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
