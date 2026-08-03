export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface KnowledgeBaseItem {
  id: number
  category: string
  title: string
  keywords: string[]
  content: string
}

export interface ChatResponse {
  message: string
}
