/**
 * Retrieval pipeline types.
 * These interfaces abstract the embedding store so a vector database
 * (Pinecone, pgvector, etc.) can replace the local JSON store later.
 */

export interface EmbeddingRecord {
  id: number
  title: string
  embedding: number[]
}

export interface EmbeddingStore {
  /** Returns all stored embedding records. Loaded once and cached. */
  getRecords(): EmbeddingRecord[]
}

export interface EmbeddingClient {
  /** Generates a vector embedding for the given text. */
  embed(text: string): Promise<number[]>
}

export interface ScoredResult {
  id: number
  score: number
}
