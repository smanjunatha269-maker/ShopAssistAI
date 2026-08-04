# Retrieval Pipeline

ShopAssist AI uses **embedding-based semantic retrieval** to find the most relevant company policies for a customer question.

## Overview

```
Customer Question
       │
       ▼
┌──────────────────┐
│ embeddingClient  │  ← embeds the question (/api/embed or local fallback)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ embeddingStore   │  ← loads pre-computed policy embeddings (data/embeddings.json)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ cosine similarity│  ← ranks policies, returns top 3
└────────┬─────────┘
         │
         ▼
   Top 3 Policies → passed to /api/chat (LLM)
```

## Files

| File | Purpose |
|------|---------|
| `data/knowledgeBase.json` | Source of truth for policy content (id, title, category, content) |
| `data/embeddings.json` | Pre-computed policy embeddings (id, title, embedding) |
| `scripts/generateEmbeddings.ts` | Dev script to regenerate embeddings when the knowledge base changes |
| `api/embed.ts` | Serverless endpoint that embeds customer questions via OpenRouter |
| `src/retrieval/types.ts` | `EmbeddingStore` and `EmbeddingClient` interfaces |
| `src/retrieval/embeddingStore.ts` | Local JSON implementation of `EmbeddingStore` |
| `src/retrieval/embeddingClient.ts` | Hybrid client: server API with local browser fallback |
| `src/retrieval/similarity.ts` | Cosine similarity and ranking utilities |
| `src/services/retrievalService.ts` | Public retrieval API (`searchKnowledgeBase`) |

## Regenerating Embeddings

When you add or edit policies in `knowledgeBase.json`, regenerate embeddings:

```bash
# With OpenRouter (recommended for production)
OPENROUTER_API_KEY=sk-... npm run generate:embeddings

# Without API key — uses local Xenova/all-MiniLM-L6-v2 model
npm run generate:embeddings
```

**Important:** Policy embeddings and query embeddings must use the same model. If you generate policy embeddings with OpenRouter, ensure `OPENROUTER_EMBEDDING_MODEL` is set in Vercel so `/api/embed` uses the same model.

## Swapping for a Vector Database

The retrieval layer is designed for easy replacement:

1. Implement `EmbeddingStore` with your vector DB client (e.g. Pinecone, pgvector)
2. Optionally replace `EmbeddingClient` if the DB handles query embedding internally
3. Keep `searchKnowledgeBase()` signature unchanged — no UI or API changes needed

```typescript
// Future example
class PineconeEmbeddingStore implements EmbeddingStore {
  getRecords(): EmbeddingRecord[] { /* ... */ }
}
```

## Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `OPENROUTER_API_KEY` | `api/embed`, generate script | OpenRouter API key |
| `OPENROUTER_EMBEDDING_MODEL` | `api/embed`, generate script | Embedding model (default: `openai/text-embedding-3-small`) |
