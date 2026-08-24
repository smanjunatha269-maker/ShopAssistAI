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
│  3. Embed the question (MiniLM)         │
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
| `api/_lib/minilmEmbedding.ts` | Shared MiniLM singleton + Vercel-safe cache config |
| `api/_lib/retrievalService.ts` | Server-side retrieval: load, embed, similarity, top-K |
| `api/_lib/llmService.ts` | Server-side LLM: grounded prompt + Nemotron call |
| `api/chat.ts` | Thin route: calls retrievalService then llmService |

## Regenerating Embeddings

When you add or edit policies in `knowledgeBase.json`:

```bash
npm run generate:embeddings
```

Embeddings are always generated with `Xenova/all-MiniLM-L6-v2`. Policy embeddings and query embeddings must use the same model.

## MiniLM Cache on Vercel

`@xenova/transformers` downloads model weights on first use. On Vercel, the deployment filesystem is read-only, so the cache is redirected to `/tmp/shopassist-minilm` (or `MINILM_CACHE_DIR` if set). The pipeline is cached as a singleton per warm serverless instance.

## Swapping for a Vector Database

Replace `retrieveTopPolicies()` internals in `api/_lib/retrievalService.ts` with your vector DB client. The `api/chat.ts` route and frontend do not need to change.

## Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `OPENROUTER_API_KEY` | llmService | OpenRouter API key for Nemotron generation |
| `OPENROUTER_MODEL` | llmService | Chat model (e.g. Nemotron via OpenRouter) |
| `MINILM_CACHE_DIR` | minilmEmbedding | Optional override for MiniLM model cache directory |
