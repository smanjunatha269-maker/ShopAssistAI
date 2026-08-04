import knowledgeBaseData from '../../data/knowledgeBase.json'
import { embeddingClient } from '../retrieval/embeddingClient'
import { embeddingStore } from '../retrieval/embeddingStore'
import { rankBySimilarity } from '../retrieval/similarity'
import type { KnowledgeBaseItem } from '../types'

const KNOWLEDGE_BASE: KnowledgeBaseItem[] =
  knowledgeBaseData as KnowledgeBaseItem[]

const POLICY_BY_ID = new Map(KNOWLEDGE_BASE.map((policy) => [policy.id, policy]))

const TOP_RESULTS = 3

/**
 * Semantic retrieval pipeline:
 *
 * 1. Embed the customer question via /api/embed
 * 2. Compare against pre-computed policy embeddings (cosine similarity)
 * 3. Return the top 3 most similar policies
 *
 * This function is the public retrieval API. Callers (supportService, UI)
 * do not need to know whether retrieval is keyword-based or embedding-based.
 * The embedding store and embedding client can be swapped for a vector
 * database and managed embedding service without changing this signature.
 */
export async function searchKnowledgeBase(
  userQuestion: string,
): Promise<KnowledgeBaseItem[]> {
  const queryEmbedding = await embeddingClient.embed(userQuestion)
  const records = embeddingStore.getRecords()

  const ranked = rankBySimilarity(queryEmbedding, records, TOP_RESULTS)

  return ranked
    .map((result) => POLICY_BY_ID.get(result.id))
    .filter((policy): policy is KnowledgeBaseItem => policy !== undefined)
}
