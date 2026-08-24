/**
 * Shared MiniLM embedding pipeline.
 *
 * Uses Xenova/all-MiniLM-L6-v2 for both policy embedding generation
 * (scripts/generateEmbeddings.ts) and runtime question embedding
 * (retrievalService.ts).
 *
 * On Vercel, model weights are cached under /tmp because the deployment
 * filesystem under /var/task is read-only.
 */

import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const MINILM_MODEL = 'Xenova/all-MiniLM-L6-v2'
export const MINILM_EMBEDDING_DIMENSION = 384

type FeatureExtractor = (
  text: string,
  options?: { pooling?: string; normalize?: boolean },
) => Promise<{ data: Float32Array }>

let transformersEnvConfigured = false
let extractorPromise: Promise<FeatureExtractor> | null = null

/**
 * Returns a writable cache directory for @xenova/transformers.
 * Vercel serverless only allows writes under /tmp.
 */
export function getMiniLMCacheDir(): string {
  if (process.env.MINILM_CACHE_DIR) {
    return process.env.MINILM_CACHE_DIR
  }

  if (process.env.VERCEL) {
    return '/tmp/shopassist-minilm'
  }

  return join(tmpdir(), 'shopassist-minilm')
}

function configureTransformersEnv(
  env: typeof import('@xenova/transformers').env,
): void {
  if (transformersEnvConfigured) {
    return
  }

  env.cacheDir = getMiniLMCacheDir()
  env.useBrowserCache = false
  env.useFSCache = true
  transformersEnvConfigured = true
}

export class MiniLMEmbeddingError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'MiniLMEmbeddingError'
  }
}

/**
 * Returns a singleton feature-extraction pipeline for the current
 * serverless instance. The model is downloaded once into the configured
 * cache directory, then reused from memory on subsequent requests.
 */
export async function getMiniLMExtractor(): Promise<FeatureExtractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      try {
        const { env, pipeline } = await import('@xenova/transformers')
        configureTransformersEnv(env)

        return (await pipeline(
          'feature-extraction',
          MINILM_MODEL,
        )) as unknown as FeatureExtractor
      } catch (error) {
        extractorPromise = null
        throw new MiniLMEmbeddingError(
          `Failed to load MiniLM model (${MINILM_MODEL}). ` +
            `Cache directory: ${getMiniLMCacheDir()}`,
          { cause: error },
        )
      }
    })()
  }

  return extractorPromise
}

/**
 * Embeds text with Xenova/all-MiniLM-L6-v2 using mean pooling and
 * L2 normalization — the same settings used to build embeddings.json.
 */
export async function embedWithMiniLM(text: string): Promise<number[]> {
  try {
    const extractor = await getMiniLMExtractor()
    const output = await extractor(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data)
  } catch (error) {
    if (error instanceof MiniLMEmbeddingError) {
      throw error
    }

    throw new MiniLMEmbeddingError(
      'Failed to generate MiniLM embedding for input text.',
      { cause: error },
    )
  }
}
