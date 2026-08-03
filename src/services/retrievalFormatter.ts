import type { KnowledgeBaseItem } from '../types'

const NO_RESULTS_MESSAGE =
  "I'm sorry, I couldn't find any relevant information in the knowledge base."

/**
 * Formats retrieved policies into a user-facing chat message.
 */
export function formatRetrievalResults(
  policies: KnowledgeBaseItem[],
): string {
  if (policies.length === 0) {
    return NO_RESULTS_MESSAGE
  }

  const sections = policies.map((policy) =>
    [policy.title, policy.category, policy.content].join('\n\n'),
  )

  return ['Relevant Information Found', '', ...sections].join('\n\n')
}
