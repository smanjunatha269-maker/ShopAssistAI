import type { VercelRequest, VercelResponse } from '@vercel/node'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/embeddings'
const DEFAULT_EMBEDDING_MODEL = 'openai/text-embedding-3-small'

interface EmbedRequestBody {
  text: string
}

function isValidRequestBody(body: unknown): body is EmbedRequestBody {
  if (!body || typeof body !== 'object') return false
  const { text } = body as EmbedRequestBody
  return typeof text === 'string' && text.trim().length > 0
}

/**
 * Serverless endpoint that generates a text embedding for semantic retrieval.
 * Self-contained for Vercel — no local file imports.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isValidRequestBody(req.body)) {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const { text } = req.body

  try {
    const openRouterResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL ?? 'https://shopassist-ai.vercel.app',
        'X-Title': 'ShopAssist AI',
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
    })

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text()
      console.error('OpenRouter embeddings error:', errorText)
      return res.status(502).json({ error: 'Embedding service unavailable' })
    }

    const result = (await openRouterResponse.json()) as {
      data?: Array<{ embedding?: number[] }>
    }

    const embedding = result.data?.[0]?.embedding

    if (!embedding || embedding.length === 0) {
      return res.status(502).json({ error: 'Empty embedding response' })
    }

    return res.status(200).json({ embedding })
  } catch (error) {
    console.error('Embed handler error:', error)
    return res.status(500).json({ error: 'Failed to generate embedding' })
  }
}
