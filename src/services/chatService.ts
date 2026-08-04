import type { ChatApiResponse } from '../types'

/**
 * Sends the customer question to the serverless chat endpoint.
 * Retrieval and generation both happen server-side.
 */
export async function askQuestion(question: string): Promise<ChatApiResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })

  if (!response.ok) {
    throw new Error('Chat API request failed')
  }

  const data = (await response.json()) as ChatApiResponse

  if (typeof data.answer !== 'string' || data.answer.length === 0) {
    throw new Error('Invalid chat API response')
  }

  return data
}
