import knowledgeBaseData from '../../data/knowledgeBase.json'
import type { KnowledgeBaseItem } from '../types'

const KNOWLEDGE_BASE: KnowledgeBaseItem[] =
  knowledgeBaseData as KnowledgeBaseItem[]

const TOP_RESULTS = 3

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'can',
  'to',
  'of',
  'in',
  'for',
  'on',
  'with',
  'at',
  'by',
  'from',
  'as',
  'into',
  'about',
  'tell',
  'me',
  'my',
  'i',
  'you',
  'your',
  'what',
  'how',
  'when',
  'where',
  'which',
  'who',
  'please',
  'want',
  'know',
  'get',
  'any',
  'some',
])

interface ScoredPolicy {
  policy: KnowledgeBaseItem
  score: number
}

function tokenize(question: string): string[] {
  return question
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
}

function wordMatchesField(word: string, field: string): boolean {
  return field.includes(word)
}

function scorePolicy(policy: KnowledgeBaseItem, words: string[]): number {
  if (words.length === 0) return 0

  const category = policy.category.toLowerCase()
  const title = policy.title.toLowerCase()
  const content = policy.content.toLowerCase()
  const keywords = policy.keywords.map((keyword) => keyword.toLowerCase())

  let score = 0

  for (const word of words) {
    for (const keyword of keywords) {
      if (keyword === word || keyword.includes(word) || word.includes(keyword)) {
        score += 5
      }
    }

    if (wordMatchesField(word, category)) {
      score += 3
    }

    if (wordMatchesField(word, title)) {
      score += 2
    }

    if (wordMatchesField(word, content)) {
      score += 1
    }
  }

  return score
}

/**
 * Search the knowledge base for policies relevant to a user question.
 * Acts as an abstraction layer — the scoring implementation can later
 * be swapped for a vector-database search without changing callers.
 */
export async function searchKnowledgeBase(
  userQuestion: string,
): Promise<KnowledgeBaseItem[]> {
  const words = tokenize(userQuestion)

  const scored: ScoredPolicy[] = KNOWLEDGE_BASE.map((policy) => ({
    policy,
    score: scorePolicy(policy, words),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_RESULTS)

  return scored.map((entry) => entry.policy)
}
