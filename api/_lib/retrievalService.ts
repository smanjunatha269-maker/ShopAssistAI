/**
 * Server-side retrieval service.
 *
 * Pipeline stages:
 *   1. Load pre-computed policy embeddings (data/embeddings.json)  — cached
 *   2. Load full policy content (data/knowledgeBase.json)          — cached
 *   3. Embed the customer question with Xenova/all-MiniLM-L6-v2
 *   4. Rank stored embeddings by cosine similarity
 *   5. Return the top-K matching policies with full content
 *
 * The local JSON store can later be replaced by a vector database by
 * reimplementing loadEmbeddings()/retrieveTopPolicies() with the same
 * signatures — the chat API route will not need to change.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  embedWithMiniLM,
  MINILM_EMBEDDING_DIMENSION,
  MiniLMEmbeddingError,
} from './minilmEmbedding.js'

export { MiniLMEmbeddingError }

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

const TOP_K = 3

/** Tune after inspecting logged similarity scores; not applied yet. */
const POLICY_SIMILARITY_THRESHOLD = 0.0

export interface PolicySimilarityMatch {
  id: number
  title: string
  score: number
}

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
/* Stage 3: question embedding (MiniLM only)                           */
/* ------------------------------------------------------------------ */

function assertEmbeddingCompatibility(storedDimension: number): void {
  if (storedDimension !== MINILM_EMBEDDING_DIMENSION) {
    throw new MiniLMEmbeddingError(
      `Embedding dimension mismatch: embeddings.json has ${storedDimension}-dimensional ` +
        `vectors, but ${MINILM_EMBEDDING_DIMENSION} are expected from Xenova/all-MiniLM-L6-v2. ` +
        'Regenerate data/embeddings.json with npm run generate:embeddings.',
    )
  }
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

function rankPoliciesBySimilarity(
  queryEmbedding: number[],
  embeddings: EmbeddingRecord[],
  topK: number,
): PolicySimilarityMatch[] {
  return embeddings
    .map((record) => ({
      id: record.id,
      title: record.title,
      score: cosineSimilarity(queryEmbedding, record.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

function logRetrievalScores(
  question: string,
  matches: PolicySimilarityMatch[],
): void {
  const lines = [
    '[Retrieval Debug]',
    `Question: ${question}`,
    ...matches.map(
      (match, index) =>
        `${index + 1}. ${match.title} | similarity: ${match.score.toFixed(4)}`,
    ),
  ]

  console.log(lines.join('\n'))
}

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
  assertEmbeddingCompatibility(storedDimension)

  const queryEmbedding = await embedWithMiniLM(question)
  const rankedMatches = rankPoliciesBySimilarity(queryEmbedding, embeddings, topK)

  logRetrievalScores(question, rankedMatches)

  // Future relevance gate — not applied yet while we inspect logged scores.
  // const relevantMatches = rankedMatches.filter(
  //   (match) => match.score >= POLICY_SIMILARITY_THRESHOLD,
  // )

  const policyById = loadPolicyIndex()

  return rankedMatches
    .map((match) => policyById.get(match.id))
    .filter((policy): policy is KnowledgeBasePolicy => policy !== undefined)
}
