# Retrieval Pipeline

ShopAssist AI uses **server-side embedding-based semantic retrieval** to find the most relevant company policies before calling the LLM.

## Overview

```
Frontend: POST /api/chat { question }
                │
                ▼
┌─────────────────────────────────────────┐
│ api/chat.ts  (thin orchestration only)  │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ api/_lib/retrievalService.ts            │
│  1. Load embeddings.json (cached)       │
│  2. Load knowledgeBase.json (cached)    │
│  3. Embed the question                  │
│  4. Cosine similarity vs all embeddings │
│  5. Return top-K policies with content  │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ api/_lib/llmService.ts                  │
│  Build grounded prompt → Nemotron       │
│  (OpenRouter) → return answer           │
└───────────────┬─────────────────────────┘
                │
                ▼
         { answer } → frontend
```

## Files

| File | Purpose |
|------|---------|
| `data/knowledgeBase.json` | Source of truth for policy content |
| `data/embeddings.json` | Pre-computed policy embeddings (id, title, embedding) |
| `scripts/generateEmbeddings.ts` | Dev script to regenerate embeddings when KB changes |
| `api/_lib/retrievalService.ts` | Server-side retrieval: load, embed, similarity, top-K |
| `api/_lib/llmService.ts` | Server-side LLM: grounded prompt + Nemotron call |
| `api/chat.ts` | Thin route: calls retrievalService then llmService |

## Regenerating Embeddings

When you add or edit policies in `knowledgeBase.json`:

```bash
# With OpenRouter (recommended for production)
OPENROUTER_API_KEY=sk-... npm run generate:embeddings

# Without API key — uses local Xenova/all-MiniLM-L6-v2 model
npm run generate:embeddings
```

**Important:** Policy embeddings and query embeddings must use the same model. The retrieval service checks embedding dimensions and falls back to the local Xenova model if they mismatch.

## Swapping for a Vector Database

Replace `retrieveTopPolicies()` internals in `api/_lib/retrievalService.ts` with your vector DB client. The `api/chat.ts` route and frontend do not need to change.

## Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `OPENROUTER_API_KEY` | retrieval + LLM + generate script | OpenRouter API key |
| `OPENROUTER_MODEL` | llmService | Chat model (e.g. Nemotron) |
| `OPENROUTER_EMBEDDING_MODEL` | retrievalService + generate script | Embedding model |
