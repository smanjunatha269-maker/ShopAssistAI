# ShopAssist AI

AI-powered customer support assistant for e-commerce, built with React, Vite, TypeScript, and Tailwind CSS.

## Features

- Modern landing page with topic quick-actions
- ChatGPT-style chat interface (scrollable messages, fixed input)
- **Semantic retrieval** with embedding-based policy search
- AI-powered answers via OpenRouter (serverless API)
- Source citations displayed under each response

## Tech Stack

- React 19
- Vite 8
- TypeScript
- Tailwind CSS 4
- OpenRouter (LLM + embeddings)
- Vercel (deployment)

## Project Structure

```
src/
  components/        # Reusable UI components
  pages/             # Page-level components
  retrieval/         # Embedding store, similarity, embedding client
  services/          # Retrieval, chat, and orchestration services
  types/             # Shared TypeScript types
data/
  knowledgeBase.json # Policy content (source of truth)
  embeddings.json    # Pre-computed policy embeddings
scripts/
  generateEmbeddings.ts  # Regenerate embeddings when KB changes
api/
  chat.ts            # Serverless AI generation endpoint
  embed.ts           # Serverless query embedding endpoint
docs/
  RETRIEVAL.md       # Retrieval pipeline documentation
```

## Environment Variables

Copy `.env.example` to `.env.local` and set:

```
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small
```

## Getting Started

```bash
npm install
npm run generate:embeddings   # only needed when knowledge base changes
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

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

1. **Retrieval** — `searchKnowledgeBase()` embeds the question, compares against stored policy embeddings via cosine similarity, and returns the top 3 policies
2. **Generation** — `/api/chat` sends policies + question to OpenRouter
3. **UI** — displays the AI answer with cited policy sources

See [docs/RETRIEVAL.md](docs/RETRIEVAL.md) for the full retrieval pipeline documentation.

Retrieval and generation are kept separate. The frontend never calls OpenRouter directly.
