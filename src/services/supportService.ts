import { askQuestion } from './chatService'
import type { AssistantResponse } from '../types'

const API_ERROR_MESSAGE =
  "I'm unable to answer your question right now. Please try again."

/**
 * Frontend orchestration for a support question.
 * Retrieval and generation run server-side inside /api/chat;
 * this service only handles the request and error fallback.
 */
export async function getSupportResponse(
  userQuestion: string,
): Promise<AssistantResponse> {
  try {
    const response = await askQuestion(userQuestion)
    return { answer: response.answer }
  } catch {
    return { answer: API_ERROR_MESSAGE }
  }
}
