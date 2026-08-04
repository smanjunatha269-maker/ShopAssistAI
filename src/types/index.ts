export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  timestamp: Date
}

export interface KnowledgeBaseItem {
  id: number
  category: string
  title: string
  keywords: string[]
  content: string
}

export interface ChatRequestBody {
  question: string
}

export interface ChatApiResponse {
  answer: string
}

export interface AssistantResponse {
  answer: string
  sources?: string[]
}
