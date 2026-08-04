export interface RetrievedPolicy {
  id: number
  category: string
  title: string
  keywords: string[]
  content: string
}

export interface ChatRequestBody {
  question: string
  retrievedPolicies: RetrievedPolicy[]
}

export interface ChatApiResponse {
  answer: string
  sources: string[]
}
