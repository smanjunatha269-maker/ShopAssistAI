import { generateAnswer } from './chatService'
import { searchKnowledgeBase } from './retrievalService'
import type { AssistantResponse } from '../types'

const NO_POLICIES_MESSAGE =
  "I couldn't find any relevant company policy."

const API_ERROR_MESSAGE =
  "I'm unable to answer your question right now. Please try again."

/**
 * Orchestrates retrieval and AI generation.
 * Retrieval and generation remain separate concerns.
 */
export async function getSupportResponse(
  userQuestion: string,
): Promise<AssistantResponse> {
  let policies

  try {
    policies = await searchKnowledgeBase(userQuestion)
  } catch {
    return { answer: API_ERROR_MESSAGE, sources: [] }
  }

  if (policies.length === 0) {
    return { answer: NO_POLICIES_MESSAGE, sources: [] }
  }

  try {
    return await generateAnswer({
      question: userQuestion,
      retrievedPolicies: policies,
    })
  } catch {
    return { answer: API_ERROR_MESSAGE, sources: [] }
  }
}
