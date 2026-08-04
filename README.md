# ShopAssist AI

AI-powered customer support assistant for e-commerce, built with React, Vite, TypeScript, and Tailwind CSS.

## Features

- Modern landing page with topic quick-actions
- ChatGPT-style chat interface (scrollable messages, fixed input)
- **Server-side semantic retrieval** with embedding-based policy search
- AI-powered answers via Nemotron (OpenRouter)
- Source citations displayed under each response

## Tech Stack

- React 19
- Vite 8
- TypeScript
- Tailwind CSS 4
- OpenRouter (Nemotron + embeddings)
- Vercel (deployment)

## Project Structure

```
src/
  components/        # Reusable UI components
  pages/             # Page-level components
  services/          # Frontend chat orchestration
  types/             # Shared TypeScript types
data/
  knowledgeBase.json # Policy content (source of truth)
  embeddings.json    # Pre-computed policy embeddings
scripts/
  generateEmbeddings.ts  # Regenerate embeddings when KB changes
api/
  chat.ts            # Thin chat endpoint (orchestration only)
  _lib/
    retrievalService.ts  # Server-side semantic retrieval
    llmService.ts        # Server-side Nemotron generation
docs/
  RETRIEVAL.md       # Retrieval pipeline documentation
```

## Environment Variables

Copy `.env.example` to `.env.local` and set:

```
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=nvidia/nemotron-...   # Nemotron via OpenRouter
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small
```

## Getting Started

```bash
npm install
npm run generate:embeddings   # only needed when knowledge base changes
npm run dev
```

For local development with API endpoints:

```bash
npx vercel dev
```

## Deployment

Deploy to Vercel and configure environment variables in your project settings.

```bash
npx vercel
```

Before deploying, regenerate embeddings with your production OpenRouter credentials:

```bash
OPENROUTER_API_KEY=sk-... npm run generate:embeddings
```

## Architecture

1. **Frontend** sends `{ question }` to `/api/chat`
2. **Retrieval** (`api/_lib/retrievalService.ts`) embeds the question, ranks policies by cosine similarity, returns top-K with full content
3. **Generation** (`api/_lib/llmService.ts`) builds a grounded prompt and calls Nemotron via OpenRouter
4. **UI** displays the answer

See [docs/RETRIEVAL.md](docs/RETRIEVAL.md) for the full retrieval pipeline documentation.

All retrieval and LLM logic runs server-side. The frontend never calls OpenRouter directly.
