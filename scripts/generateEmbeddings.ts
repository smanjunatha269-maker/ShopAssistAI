import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/embeddings'
const DEFAULT_OPENROUTER_MODEL = 'openai/text-embedding-3-small'
const LOCAL_MODEL = 'Xenova/all-MiniLM-L6-v2'

interface KnowledgeBasePolicy {
  id: number
  title: string
  category: string
  content: string
}

interface EmbeddingOutput {
  id: number
  title: string
  embedding: number[]
}

function buildPolicyText(policy: KnowledgeBasePolicy): string {
  return `${policy.title}\n${policy.category}\n${policy.content}`
}

async function embedWithOpenRouter(
  text: string,
  apiKey: string,
  model: string,
): Promise<number[]> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: text }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter embedding failed: ${errorText}`)
  }

  const result = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>
  }

  const embedding = result.data?.[0]?.embedding

  if (!embedding?.length) {
    throw new Error('OpenRouter returned an empty embedding')
  }

  return embedding
}

async function embedWithLocalModel(text: string): Promise<number[]> {
  const { pipeline } = await import('@xenova/transformers')
  const extractor = await pipeline('feature-extraction', LOCAL_MODEL)
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data as Float32Array)
}

async function generateEmbedding(
  text: string,
): Promise<{ embedding: number[]; provider: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_EMBEDDING_MODEL ?? DEFAULT_OPENROUTER_MODEL

  if (apiKey) {
    const embedding = await embedWithOpenRouter(text, apiKey, model)
    return { embedding, provider: `openrouter:${model}` }
  }

  console.warn(
    `OPENROUTER_API_KEY not set — using local model (${LOCAL_MODEL}). ` +
      'Re-run with OpenRouter credentials before production deploy.',
  )

  const embedding = await embedWithLocalModel(text)
  return { embedding, provider: `local:${LOCAL_MODEL}` }
}

async function main() {
  const knowledgeBasePath = resolve(ROOT, 'data/knowledgeBase.json')
  const outputPath = resolve(ROOT, 'data/embeddings.json')

  const policies = JSON.parse(
    readFileSync(knowledgeBasePath, 'utf-8'),
  ) as KnowledgeBasePolicy[]

  console.log(`Generating embeddings for ${policies.length} policies...`)

  const records: EmbeddingOutput[] = []
  let provider = ''

  for (const policy of policies) {
    const text = buildPolicyText(policy)
    const result = await generateEmbedding(text)
    provider = result.provider

    records.push({
      id: policy.id,
      title: policy.title,
      embedding: result.embedding,
    })

    console.log(`  ✓ ${policy.title}`)
  }

  writeFileSync(outputPath, JSON.stringify(records, null, 2))

  console.log(`\nSaved ${records.length} embeddings to data/embeddings.json`)
  console.log(`Provider: ${provider}`)
}

main().catch((error) => {
  console.error('Embedding generation failed:', error)
  process.exit(1)
})
