import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildUserPrompt, SYSTEM_PROMPT } from './promptBuilder'
import type { ChatApiResponse, ChatRequestBody } from './types'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

function parseModelResponse(content: string): ChatApiResponse {
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
  const parsed = JSON.parse(cleaned) as Partial<ChatApiResponse>

  if (!parsed.answer || typeof parsed.answer !== 'string') {
    throw new Error('Model response missing answer field')
  }

  return {
    answer: parsed.answer,
    sources: Array.isArray(parsed.sources)
      ? parsed.sources.filter((source): source is string => typeof source === 'string')
      : [],
  }
}

function isValidRequestBody(body: unknown): body is ChatRequestBody {
  if (!body || typeof body !== 'object') return false

  const { question, retrievedPolicies } = body as ChatRequestBody

  return (
    typeof question === 'string' &&
    question.trim().length > 0 &&
    Array.isArray(retrievedPolicies) &&
    retrievedPolicies.length > 0
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isValidRequestBody(req.body)) {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL

  if (!apiKey || !model) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const { question, retrievedPolicies } = req.body

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
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(question, retrievedPolicies) },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text()
      console.error('OpenRouter API error:', errorText)
      return res.status(502).json({ error: 'AI service unavailable' })
    }

    const completion = (await openRouterResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const content = completion.choices?.[0]?.message?.content

    if (!content) {
      return res.status(502).json({ error: 'Empty response from AI service' })
    }

    const result = parseModelResponse(content)
    return res.status(200).json(result)
  } catch (error) {
    console.error('Chat handler error:', error)
    return res.status(500).json({ error: 'Failed to generate response' })
  }
}
