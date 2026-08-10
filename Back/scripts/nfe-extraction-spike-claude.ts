// Spike de validação (variante Claude): lê uma imagem de nota fiscal e pede pro
// Claude extrair os itens em JSON estruturado. Sem UI, sem gravar nada no banco —
// só pra medir se a qualidade de extração compensa investir na feature completa.
// Uso: npx tsx scripts/nfe-extraction-spike-claude.ts <caminho-da-imagem>
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
    console.error('ANTHROPIC_API_KEY não está definida no .env')
    process.exit(1)
}

const imagePath = process.argv[2]
if (!imagePath) {
    console.error('Uso: npx tsx scripts/nfe-extraction-spike-claude.ts <caminho-da-imagem>')
    process.exit(1)
}

const mediaTypeByExt: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
}
const mediaType = mediaTypeByExt[extname(imagePath).toLowerCase()]
if (!mediaType) {
    console.error(`Extensão não suportada: ${extname(imagePath)} (use png, jpg ou webp — PDF é um content block "document", não "image")`)
    process.exit(1)
}

const imageBase64 = readFileSync(imagePath).toString('base64')

// Mesmo schema da variante Gemini, pra comparar maçã com maçã.
const jsonSchema = {
    type: 'object',
    properties: {
        numeroNota: { type: 'string', description: 'Número da nota fiscal, string vazia se ilegível.' },
        emitente: { type: 'string', description: 'Nome do emitente/fornecedor, string vazia se ilegível.' },
        itens: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    codigo: { type: 'string', description: 'Código/SKU do item na nota, se houver. String vazia se não houver.' },
                    descricao: { type: 'string', description: 'Descrição/nome do item exatamente como está na nota.' },
                    unidade: { type: 'string', description: 'Unidade de medida (UN, KG, PAR, CX, etc), se houver. String vazia se não houver.' },
                    quantidade: { type: 'number' },
                    valorUnitario: { type: 'number' },
                    valorTotal: { type: 'number' },
                },
                required: ['descricao', 'quantidade', 'valorUnitario', 'valorTotal'],
                additionalProperties: false,
            },
        },
        valorTotalNota: { type: 'number', description: 'Valor total da nota. 0 se não encontrado.' },
    },
    required: ['itens'],
    additionalProperties: false,
}

const prompt = `Extraia os itens desta nota fiscal (documento de entrada de mercadoria) no formato JSON pedido.
Regras:
- Use exatamente os valores que aparecem na nota — não invente, arredonde ou complete dados ausentes.
- Se um campo não estiver legível ou não existir, use string vazia (texto) ou 0 (número), nunca um valor chutado.
- "quantidade", "valorUnitario" e "valorTotal" devem ser números (não strings), com ponto decimal.`

async function main() {
    const client = new Anthropic({ apiKey })

    const startedAt = Date.now()
    const response = await client.messages.create({
        model: 'claude-opus-5',
        max_tokens: 4096,
        output_config: {
            format: { type: 'json_schema', schema: jsonSchema },
        },
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/webp', data: imageBase64 } },
                    { type: 'text', text: prompt },
                ],
            },
        ],
    })
    const elapsedMs = Date.now() - startedAt

    if (response.stop_reason === 'refusal') {
        console.error('Claude recusou o pedido (stop_reason: refusal). stop_details:', response.stop_details)
        process.exit(1)
    }

    const textBlock = response.content.find((block) => block.type === 'text')
    console.log('--- resposta bruta ---')
    console.log(textBlock?.text)

    console.log('\n--- parseada ---')
    const parsed = JSON.parse(textBlock?.text ?? '{}')
    console.log(JSON.stringify(parsed, null, 2))

    console.log('\n--- métricas ---')
    console.log(`tempo: ${elapsedMs}ms`)
    console.log(`tokens entrada: ${response.usage.input_tokens} | saída: ${response.usage.output_tokens}`)
}

main().catch((error) => {
    console.error('Falha na extração:', error)
    process.exit(1)
})
