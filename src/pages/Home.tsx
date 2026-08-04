import { useCallback, useEffect, useRef, useState } from 'react'
import ChatInput from '../components/ChatInput'
import ChatWindow from '../components/ChatWindow'
import Header from '../components/Header'
import { getSupportResponse } from '../services/supportService'
import type { Message } from '../types'

const TOPICS = [
  'Returns',
  'Shipping',
  'Refunds',
  'Warranty',
  'Payments',
  'Memberships',
  'Promotions',
]

function createMessage(
  role: Message['role'],
  content: string,
  sources?: string[],
): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    sources,
    timestamp: new Date(),
  }
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  const handleSend = async (content: string) => {
    const userMessage = createMessage('user', content)
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await getSupportResponse(content)
      const assistantMessage = createMessage(
        'assistant',
        response.answer,
        response.sources,
      )
      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const showLanding = messages.length === 0

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-50 to-white">
      <Header showSubtitle={showLanding} />

      {showLanding && (
        <section className="border-b border-slate-200/60 bg-white/50 px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
              Customer Support
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              ShopAssist AI
            </h2>
            <p className="mt-2 text-lg font-medium text-indigo-600">
              AI-powered Customer Support Assistant
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Get instant answers about returns, shipping, refunds, warranty,
              payments, memberships, and promotions. Our AI assistant is here to
              help you shop with confidence.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => handleSend(`Tell me about ${topic.toLowerCase()}`)}
                  disabled={isLoading}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <main className="flex min-h-0 flex-1 flex-col">
        <ChatWindow messages={messages} isLoading={isLoading} />
        <div ref={chatEndRef} />
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </main>
    </div>
  )
}
