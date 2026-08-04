import type { ScoredResult } from './types'

/**
 * Computes cosine similarity between two equal-length vectors.
 * Returns a value between -1 and 1 (higher = more similar).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
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
  if (denominator === 0) return 0

  return dotProduct / denominator
}

/**
 * Ranks embedding records by cosine similarity to a query vector.
 * Returns the top K results sorted by score descending.
 */
export function rankBySimilarity(
  queryEmbedding: number[],
  records: Array<{ id: number; embedding: number[] }>,
  topK: number,
): ScoredResult[] {
  return records
    .map((record) => ({
      id: record.id,
      score: cosineSimilarity(queryEmbedding, record.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
