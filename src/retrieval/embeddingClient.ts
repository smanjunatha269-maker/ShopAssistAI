import type { EmbeddingClient } from './types'

interface EmbedApiResponse {
  embedding: number[]
}

const LOCAL_MODEL = 'Xenova/all-MiniLM-L6-v2'

let localPipeline: Awaited<
  ReturnType<typeof import('@xenova/transformers')['pipeline']>
> | null = null

async function embedWithLocalModel(text: string): Promise<number[]> {
  const { pipeline } = await import('@xenova/transformers')

  if (!localPipeline) {
    localPipeline = await pipeline('feature-extraction', LOCAL_MODEL)
  }

  type FeatureExtractor = (
    text: string,
    options?: { pooling?: string; normalize?: boolean },
  ) => Promise<{ data: Float32Array }>

  const output = await (localPipeline as FeatureExtractor)(text, {
    pooling: 'mean',
    normalize: true,
  })

  return Array.from(output.data as Float32Array)
}

async function embedWithApi(text: string): Promise<number[]> {
  const response = await fetch('/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    throw new Error('Embedding API request failed')
  }

  const data = (await response.json()) as EmbedApiResponse

  if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
    throw new Error('Invalid embedding response')
  }

  return data.embedding
}

/**
 * Generates query embeddings via the serverless /api/embed endpoint.
 * Falls back to a local browser model when the API is unavailable
 * (e.g. during Vite-only dev without vercel dev).
 *
 * Policy embeddings in data/embeddings.json must be generated with the
 * same model provider. Run `npm run generate:embeddings` after changing
 * the knowledge base or switching embedding models.
 */
class HybridEmbeddingClient implements EmbeddingClient {
  async embed(text: string): Promise<number[]> {
    try {
      return await embedWithApi(text)
    } catch {
      return embedWithLocalModel(text)
    }
  }
}

export const embeddingClient: EmbeddingClient = new HybridEmbeddingClient()
