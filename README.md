# ShopAssist AI

AI-powered customer support assistant for e-commerce, built with React, Vite, TypeScript, and Tailwind CSS.

## Features

- Modern landing page with topic quick-actions
- ChatGPT-style chat interface (scrollable messages, fixed input)
- Knowledge base retrieval with relevance scoring
- AI-powered answers via OpenRouter (serverless API)
- Source citations displayed under each response

## Tech Stack

- React 19
- Vite 8
- TypeScript
- Tailwind CSS 4
- OpenRouter (LLM)
- Vercel (deployment)

## Project Structure

```
src/
  components/     # Reusable UI components
  pages/          # Page-level components
  services/       # Retrieval, chat, and orchestration services
  types/          # Shared TypeScript types
data/
  knowledgeBase.json   # Policy data
api/
  chat.ts              # Serverless AI generation endpoint
  promptBuilder.ts     # Prompt construction
  types.ts             # API request/response types
```

## Environment Variables

Copy `.env.example` to `.env.local` and set:

```
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

For local development with the API endpoint:

```bash
npx vercel dev
```

## Deployment

Deploy to Vercel and configure `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in your project environment variables.

```bash
npx vercel
```

## Architecture

1. **Retrieval** — `searchKnowledgeBase()` finds the top 3 relevant policies
2. **Generation** — `/api/chat` sends policies + question to OpenRouter
3. **UI** — displays the AI answer with cited policy sources

Retrieval and generation are kept separate. The frontend never calls OpenRouter directly.
