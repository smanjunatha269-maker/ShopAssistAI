import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { embedWithMiniLM, MINILM_MODEL } from '../api/_lib/minilmEmbedding.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

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

async function main() {
  const knowledgeBasePath = resolve(ROOT, 'data/knowledgeBase.json')
  const outputPath = resolve(ROOT, 'data/embeddings.json')

  const policies = JSON.parse(
    readFileSync(knowledgeBasePath, 'utf-8'),
  ) as KnowledgeBasePolicy[]

  console.log(
    `Generating embeddings for ${policies.length} policies with ${MINILM_MODEL}...`,
  )

  const records: EmbeddingOutput[] = []

  for (const policy of policies) {
    const text = buildPolicyText(policy)
    const embedding = await embedWithMiniLM(text)

    records.push({
      id: policy.id,
      title: policy.title,
      embedding,
    })

    console.log(`  ✓ ${policy.title}`)
  }

  writeFileSync(outputPath, JSON.stringify(records, null, 2))

  console.log(`\nSaved ${records.length} embeddings to data/embeddings.json`)
  console.log(`Model: ${MINILM_MODEL}`)
}

main().catch((error) => {
  console.error('Embedding generation failed:', error)
  process.exit(1)
})
