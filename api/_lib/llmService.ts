/**
 * Server-side LLM service.
 *
 * Builds the grounded prompt from retrieved policies and calls the
 * configured model (Nemotron via OpenRouter). All AI communication
 * stays server-side — the frontend never talks to OpenRouter directly.
 */

import type { KnowledgeBasePolicy } from './retrievalService.js'

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions'

const SYSTEM_PROMPT = `You are ShopAssist AI, a helpful company policy assistant.

For questions that are clearly asking about company policies:
- Use the supplied retrieved policies as the authoritative source.
- Answer only using information supported by those policies.
- Never invent, infer, or assume company policy details.
- If the retrieved policies don't contain enough information to answer the policy question, say:
  "I couldn't find that information in the available company policies."

For conversational or non-policy messages:
- Respond naturally and helpfully.
- You may greet the user, acknowledge their statement, ask clarifying questions, or explain what you can help with.
- Do not invent or imply company policies.

Examples:
- "Hello" → greet the user and explain that ShopAssist can help with company policies.
- "I don't like the product" → acknowledge the concern and offer to help with relevant return, exchange, refund, or other policy information without claiming any specific policy.
- "What is the return policy?" → answer using only the retrieved return policy.
- "Can I return this after 90 days?" → answer using the supplied policies; if the policies don't address this, use the fallback statement.

Keep answers concise and conversational.
Never fabricate company policy information.`

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
      temperature:0.1,
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
