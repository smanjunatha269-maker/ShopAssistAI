import type { KnowledgeBaseItem } from '../types'

const mockResults: KnowledgeBaseItem[] = [
  {
    id: 'returns-001',
    category: 'returns',
    title: 'Return Policy',
    content:
      'Items can be returned within 30 days of delivery in their original condition.',
  },
  {
    id: 'shipping-001',
    category: 'shipping',
    title: 'Shipping Times',
    content:
      'Standard shipping takes 5–7 business days. Express shipping delivers in 2–3 business days.',
  },
]

/**
 * Placeholder knowledge-base search.
 * Returns mock data until retrieval is implemented.
 */
export async function searchKnowledgeBase(
  userQuestion: string,
): Promise<KnowledgeBaseItem[]> {
  void userQuestion

  return new Promise((resolve) => {
    setTimeout(() => resolve(mockResults), 300)
  })
}
