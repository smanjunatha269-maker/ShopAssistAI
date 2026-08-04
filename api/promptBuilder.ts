import type { RetrievedPolicy } from './types'

export const SYSTEM_PROMPT = `You are ShopAssist AI.

You are a customer support assistant.

Answer ONLY using the retrieved company policies.

Never invent information.

Never answer from your own knowledge.

If the answer cannot be found in the provided policies, respond:

"I couldn't find that information in our knowledge base."

Always be polite.

Keep responses under 100 words.

Respond with JSON only in this exact format:
{"answer":"your response here","sources":["Policy Title 1","Policy Title 2"]}

The sources array must contain the titles of the policies you used to form your answer.`

export function buildUserPrompt(
  question: string,
  policies: RetrievedPolicy[],
): string {
  const policiesText = policies
    .map(
      (policy, index) =>
        `Policy ${index + 1}:\nTitle: ${policy.title}\nCategory: ${policy.category}\nContent: ${policy.content}`,
    )
    .join('\n\n')

  return `Customer Question:\n${question}\n\nRetrieved Policies:\n${policiesText}`
}
