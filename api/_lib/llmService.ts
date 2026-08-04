/**
 * Server-side LLM service.
 *
 * Builds the grounded prompt from retrieved policies and calls the
 * configured model (Nemotron via OpenRouter). All AI communication
 * stays server-side — the frontend never talks to OpenRouter directly.
 */

import type { KnowledgeBasePolicy } from './retrievalService.js'

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions'

const SYSTEM_PROMPT = `You are ShopAssist AI.

Answer ONLY using the supplied company policies.

If the answer cannot be found, politely say that the information is unavailable.`

/**
 * Builds the user prompt: relevant policies followed by the question.
 */
function buildUserPrompt(
  question: string,
  policies: KnowledgeBasePolicy[],
): string {
  const policiesText = policies
    .map(
      (policy, index) =>
        `Policy ${index + 1}: ${policy.title} (${policy.category})\n${policy.content}`,
    )
    .join('\n\n')

  return `Relevant Policies:\n${policiesText}\n\nUser Question:\n${question}`
}

/**
 * Sends the grounded prompt to the configured OpenRouter model and
 * returns the generated answer text.
 */
export async function generateAnswer(
  question: string,
  policies: KnowledgeBasePolicy[],
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL

  if (!apiKey || !model) {
    throw new Error('OPENROUTER_API_KEY and OPENROUTER_MODEL must be configured')
  }

  const response = await fetch(OPENROUTER_CHAT_URL, {
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
        { role: 'user', content: buildUserPrompt(question, policies) },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter chat failed: ${await response.text()}`)
  }

  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const answer = completion.choices?.[0]?.message?.content?.trim()

  if (!answer) {
    throw new Error('Empty response from the model')
  }

  return answer
}
