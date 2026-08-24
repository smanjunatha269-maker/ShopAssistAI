/**
 * One-time migration: load local policy data into Supabase pgvector.
 *
 * Reads data/knowledgeBase.json + data/embeddings.json, validates ID and
 * dimension alignment, then upserts into public.policies.
 *
 * Requires server-side credentials only — never use in frontend code.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const EMBEDDING_DIMENSION = 384

interface KnowledgeBasePolicy {
  id: number
  category: string
  title: string
  keywords: string[]
  content: string
}

interface EmbeddingRecord {
  id: number
  title: string
  embedding: number[]
}

interface PolicyRow {
  id: number
  category: string
  title: string
  keywords: string[]
  content: string
  embedding: number[]
}

function loadJson<T>(relativePath: string): T {
  const filePath = resolve(ROOT, relativePath)
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function validateAndMerge(
  policies: KnowledgeBasePolicy[],
  embeddings: EmbeddingRecord[],
): PolicyRow[] {
  const embeddingById = new Map(embeddings.map((record) => [record.id, record]))
  const policyIds = new Set(policies.map((policy) => policy.id))

  const missingEmbeddings = policies.filter((policy) => !embeddingById.has(policy.id))
  if (missingEmbeddings.length > 0) {
    throw new Error(
      `Embedding missing for policy IDs: ${missingEmbeddings.map((policy) => policy.id).join(', ')}`,
    )
  }

  const orphanEmbeddings = embeddings.filter((record) => !policyIds.has(record.id))
  if (orphanEmbeddings.length > 0) {
    throw new Error(
      `Knowledge base policy missing for embedding IDs: ${orphanEmbeddings.map((record) => record.id).join(', ')}`,
    )
  }

  return policies.map((policy) => {
    const record = embeddingById.get(policy.id)!

    if (record.embedding.length !== EMBEDDING_DIMENSION) {
      throw new Error(
        `Policy ${policy.id} (${policy.title}) has embedding dimension ` +
          `${record.embedding.length}, expected ${EMBEDDING_DIMENSION}`,
      )
    }

    return {
      id: policy.id,
      category: policy.category,
      title: policy.title,
      keywords: policy.keywords,
      content: policy.content,
      embedding: record.embedding,
    }
  })
}

async function main() {
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const supabaseServiceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const policies = loadJson<KnowledgeBasePolicy[]>('data/knowledgeBase.json')
  const embeddings = loadJson<EmbeddingRecord[]>('data/embeddings.json')

  console.log(`Loaded ${policies.length} policies and ${embeddings.length} embeddings`)

  const rows = validateAndMerge(policies, embeddings)
  console.log(`Validated ${rows.length} policy records (${EMBEDDING_DIMENSION}-dim MiniLM embeddings)`)

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await supabase
    .from('policies')
    .upsert(rows, { onConflict: 'id' })
    .select('id, title')

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`)
  }

  console.log(`\nMigrated ${data?.length ?? rows.length} policies to Supabase:`)
  for (const row of data ?? []) {
    console.log(`  ✓ [${row.id}] ${row.title}`)
  }
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
