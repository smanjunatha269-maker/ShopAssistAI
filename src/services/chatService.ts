import type { ChatApiResponse, ChatRequestBody } from '../types'

export async function generateAnswer(
  request: ChatRequestBody,
): Promise<ChatApiResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error('Chat API request failed')
  }

  return (await response.json()) as ChatApiResponse
}
