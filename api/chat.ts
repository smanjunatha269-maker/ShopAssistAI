/**
 * Chat endpoint — thin orchestration layer only.
 *
 * 1. Validate the request ({ question })
 * 2. retrievalService: semantic top-K policy retrieval
 * 3. llmService: grounded answer generation (Nemotron via OpenRouter)
 * 4. Return only the generated answer
 *
 * All retrieval and LLM logic lives in api/_lib — not in this route.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateAnswer } from './_lib/llmService.js'
import { MiniLMEmbeddingError, retrieveTopPolicies } from './_lib/retrievalService.js'

interface ChatRequestBody {
  question: string
}

function isValidRequestBody(body: unknown): body is ChatRequestBody {
  if (!body || typeof body !== 'object') return false
  const { question } = body as ChatRequestBody
  return typeof question === 'string' && question.trim().length > 0
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isValidRequestBody(req.body)) {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  const { question } = req.body

  try {
    const policies = await retrieveTopPolicies(question)

    if (policies.length === 0) {
      return res
        .status(200)
        .json({ answer: "I couldn't find any relevant company policy." })
    }

    const answer = await generateAnswer(question, policies)

    return res.status(200).json({ answer })
  } catch (error) {
    console.error('Chat handler error:', error)

    if (error instanceof MiniLMEmbeddingError) {
      return res.status(503).json({
        error:
          'The embedding model is temporarily unavailable. Please try again in a moment.',
      })
    }

    return res.status(500).json({ error: 'Failed to generate response' })
  }
}
