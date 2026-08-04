/**
 * Server-side retrieval service.
 *
 * Pipeline stages:
 *   1. Load pre-computed policy embeddings (data/embeddings.json)  — cached
 *   2. Load full policy content (data/knowledgeBase.json)          — cached
 *   3. Embed the customer question with the SAME model used for
 *      the stored embeddings
 *   4. Rank stored embeddings by cosine similarity
 *   5. Return the top-K matching policies with full content
 *
 * The local JSON store can later be replaced by a vector database by
 * reimplementing loadEmbeddings()/retrieveTopPolicies() with the same
 * signatures — the chat API route will not need to change.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface KnowledgeBasePolicy {
  id: number
  category: string
  title: string
  keywords: string[]
  content: string
}

export interface EmbeddingRecord {
  id: number
  title: string
  embedding: number[]
}

const OPENROUTER_EMBEDDINGS_URL = 'https://openrouter.ai/api/v1/embeddings'
const DEFAULT_EMBEDDING_MODEL = 'openai/text-embedding-3-small'
const LOCAL_MODEL = 'Xenova/all-MiniLM-L6-v2'
const TOP_K = 3

/* ------------------------------------------------------------------ */
/* Stage 1 + 2: cached data loading                                    */
/* ------------------------------------------------------------------ */

// Module-level caches: files are read from disk once per serverless
// instance, then served from memory on every subsequent request.
let cachedEmbeddings: EmbeddingRecord[] | null = null
let cachedPolicyById: Map<number, KnowledgeBasePolicy> | null = null

function loadEmbeddings(): EmbeddingRecord[] {
  if (!cachedEmbeddings) {
    const raw = readFileSync(join(process.cwd(), 'data', 'embeddings.json'), 'utf-8')
    cachedEmbeddings = JSON.parse(raw) as EmbeddingRecord[]
  }
  return cachedEmbeddings
}

function loadPolicyIndex(): Map<number, KnowledgeBasePolicy> {
  if (!cachedPolicyById) {
    const raw = readFileSync(
      join(process.cwd(), 'data', 'knowledgeBase.json'),
      'utf-8',
    )
    const policies = JSON.parse(raw) as KnowledgeBasePolicy[]
    cachedPolicyById = new Map(policies.map((policy) => [policy.id, policy]))
  }
  return cachedPolicyById
}

/* ------------------------------------------------------------------ */
/* Stage 3: question embedding                                         */
/* ------------------------------------------------------------------ */

// The local pipeline is cached so the model loads once per instance.
type FeatureExtractor = (
  text: string,
  options?: { pooling?: string; normalize?: boolean },
) => Promise<{ data: Float32Array }>

let localExtractorPromise: Promise<FeatureExtractor> | null = null

async function getLocalExtractor(): Promise<FeatureExtractor> {
  if (!localExtractorPromise) {
    localExtractorPromise = import('@xenova/transformers').then(
      async ({ pipeline }) =>
        (await pipeline('feature-extraction', LOCAL_MODEL)) as unknown as FeatureExtractor,
    )
  }
  return localExtractorPromise
}

async function embedWithLocalModel(text: string): Promise<number[]> {
  const extractor = await getLocalExtractor()
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

async function embedWithOpenRouter(
  text: string,
  apiKey: string,
): Promise<number[]> {
  const model = process.env.OPENROUTER_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL

  const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: text }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter embeddings failed: ${await response.text()}`)
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

/**
 * Embeds the customer question with the same model that produced
 * data/embeddings.json.
 *
 * The stored embedding dimension is used as a compatibility guard:
 * if OpenRouter returns vectors of a different dimension than the
 * stored ones (meaning embeddings.json was generated with a different
 * model), we fall back to the local model so similarity stays valid.
 */
async function embedQuestion(
  text: string,
  storedDimension: number,
): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (apiKey) {
    try {
      const embedding = await embedWithOpenRouter(text, apiKey)
      if (embedding.length === storedDimension) {
        return embedding
      }
      console.warn(
        `Embedding dimension mismatch (query ${embedding.length} vs stored ${storedDimension}); ` +
          'falling back to local model. Regenerate embeddings.json with the production model.',
      )
    } catch (error) {
      console.warn('OpenRouter embedding failed, using local fallback:', error)
    }
  }

  return embedWithLocalModel(text)
}

/* ------------------------------------------------------------------ */
/* Stage 4: cosine similarity                                          */
/* ------------------------------------------------------------------ */

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}

/* ------------------------------------------------------------------ */
/* Stage 5: top-K retrieval                                            */
/* ------------------------------------------------------------------ */

/**
 * Returns the top-K policies most semantically similar to the question,
 * with full content resolved from knowledgeBase.json.
 */
export async function retrieveTopPolicies(
  question: string,
  topK: number = TOP_K,
): Promise<KnowledgeBasePolicy[]> {
  const embeddings = loadEmbeddings()

  if (embeddings.length === 0) {
    return []
  }

  const storedDimension = embeddings[0].embedding.length
  const queryEmbedding = await embedQuestion(question, storedDimension)

  const rankedIds = embeddings
    .map((record) => ({
      id: record.id,
      score: cosineSimilarity(queryEmbedding, record.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  const policyById = loadPolicyIndex()

  return rankedIds
    .map((ranked) => policyById.get(ranked.id))
    .filter((policy): policy is KnowledgeBasePolicy => policy !== undefined)
}
