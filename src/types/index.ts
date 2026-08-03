export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface KnowledgeBaseItem {
  id: string
  category: string
  title: string
  content: string
}

export interface ChatResponse {
  message: string
}
