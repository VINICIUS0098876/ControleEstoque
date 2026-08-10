// Spike de validação: lê uma imagem de nota fiscal e pede pro Gemini extrair os
// itens em JSON estruturado. Sem UI, sem gravar nada no banco — só pra medir se a
// qualidade de extração compensa investir na feature completa (ver conversa que
// motivou isso). Uso: npx tsx scripts/nfe-extraction-spike.ts <caminho-da-imagem>
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import { GoogleGenAI, Type } from '@google/genai'

const apiKey = process.env.GEMINI_API_KEY
const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

if (!apiKey) {
    console.error('GEMINI_API_KEY não está definida no .env')
    process.exit(1)
}

const imagePath = process.argv[2]
if (!imagePath) {
    console.error('Uso: npx tsx scripts/nfe-extraction-spike.ts <caminho-da-imagem>')
    process.exit(1)
}

const mimeTypeByExt: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
}
const mimeType = mimeTypeByExt[extname(imagePath).toLowerCase()]
if (!mimeType) {
    console.error(`Extensão não suportada: ${extname(imagePath)} (use png, jpg, webp ou pdf)`)
    process.exit(1)
}

const imageBase64 = readFileSync(imagePath).toString('base64')

// Schema deliberadamente simples: só o que a tela de revisão vai precisar
// (nome/código pra casar com produto existente, quantidade e valor pra montar a
// movimentação de ENTRADA). Nada de inferir campos que a nota não mostra.
const itemSchema = {
    type: Type.OBJECT,
    properties: {
        codigo: { type: Type.STRING, description: 'Código/SKU do item na nota, se houver. String vazia se não houver.' },
        descricao: { type: Type.STRING, description: 'Descrição/nome do item exatamente como está na nota.' },
        unidade: { type: Type.STRING, description: 'Unidade de medida (UN, KG, PAR, CX, etc), se houver. String vazia se não houver.' },
        quantidade: { type: Type.NUMBER },
        valorUnitario: { type: Type.NUMBER },
        valorTotal: { type: Type.NUMBER },
    },
    required: ['descricao', 'quantidade', 'valorUnitario', 'valorTotal'],
}

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        numeroNota: { type: Type.STRING, description: 'Número da nota fiscal, string vazia se ilegível.' },
        emitente: { type: Type.STRING, description: 'Nome do emitente/fornecedor, string vazia se ilegível.' },
        itens: { type: Type.ARRAY, items: itemSchema },
        valorTotalNota: { type: Type.NUMBER, description: 'Valor total da nota. 0 se não encontrado.' },
    },
    required: ['itens'],
}

const prompt = `Extraia os itens desta nota fiscal (documento de entrada de mercadoria) no formato JSON pedido.
Regras:
- Use exatamente os valores que aparecem na nota — não invente, arredonde ou complete dados ausentes.
- Se um campo não estiver legível ou não existir, use string vazia (texto) ou 0 (número), nunca um valor chutado.
- "quantidade", "valorUnitario" e "valorTotal" devem ser números (não strings), com ponto decimal.`

async function main(apiKey: string, mimeType: string) {
    const ai = new GoogleGenAI({ apiKey })

    const startedAt = Date.now()
    const response = await ai.models.generateContent({
        model,
        contents: [
            {
                role: 'user',
                parts: [
                    { inlineData: { data: imageBase64, mimeType } },
                    { text: prompt },
                ],
            },
        ],
        config: {
            responseMimeType: 'application/json',
            responseSchema,
        },
    })
    const elapsedMs = Date.now() - startedAt

    console.log('--- resposta bruta ---')
    console.log(response.text)

    console.log('\n--- parseada ---')
    const parsed = JSON.parse(response.text ?? '{}')
    console.log(JSON.stringify(parsed, null, 2))

    const usage = response.usageMetadata
    console.log('\n--- métricas ---')
    console.log(`tempo: ${elapsedMs}ms`)
    console.log(`tokens prompt: ${usage?.promptTokenCount ?? '?'} | resposta: ${usage?.candidatesTokenCount ?? '?'} | total: ${usage?.totalTokenCount ?? '?'}`)
}

// apiKey e mimeType já foram validados como definidos acima — os guard clauses
// encerram o processo antes daqui, mas o TypeScript não propaga esse
// estreitamento pra dentro de main() por ser uma função declarada à parte.
main(apiKey!, mimeType!).catch((error) => {
    console.error('Falha na extração:', error)
    process.exit(1)
})
