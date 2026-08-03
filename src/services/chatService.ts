import type { ChatResponse } from '../types'

const FALLBACK_RESPONSE: ChatResponse = {
  message:
    'Thank you for reaching out to ShopAssist AI. Our full AI assistant is coming soon. In the meantime, you can ask about returns, shipping, refunds, warranty, payments, memberships, and promotions.',
}

export async function sendMessage(message: string): Promise<ChatResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })

    if (!response.ok) {
      throw new Error('Chat API request failed')
    }

    return (await response.json()) as ChatResponse
  } catch {
    return FALLBACK_RESPONSE
  }
}
