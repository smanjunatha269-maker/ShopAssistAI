import { formatRetrievalResults } from './retrievalFormatter'
import { searchKnowledgeBase } from './retrievalService'

/**
 * Handles a user support question by searching the knowledge base
 * and returning a formatted response. Keeps retrieval logic out of UI components.
 */
export async function getSupportResponse(
  userQuestion: string,
): Promise<string> {
  const policies = await searchKnowledgeBase(userQuestion)
  return formatRetrievalResults(policies)
}
