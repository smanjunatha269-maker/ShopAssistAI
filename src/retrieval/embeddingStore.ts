import embeddingsData from '../../data/embeddings.json'
import type { EmbeddingRecord, EmbeddingStore } from './types'

/**
 * Local JSON embedding store.
 *
 * Loads pre-computed policy embeddings from data/embeddings.json once at
 * module initialization. A future vector-database implementation can expose
 * the same EmbeddingStore interface without changing retrievalService.
 */
class LocalJsonEmbeddingStore implements EmbeddingStore {
  private readonly records: EmbeddingRecord[]

  constructor() {
    this.records = embeddingsData as EmbeddingRecord[]
  }

  getRecords(): EmbeddingRecord[] {
    return this.records
  }
}

export const embeddingStore: EmbeddingStore = new LocalJsonEmbeddingStore()
