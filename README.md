# ShopAssist AI

AI-powered customer support assistant for e-commerce, built with React, Vite, TypeScript, and Tailwind CSS.

## Features

- Modern landing page with topic quick-actions
- ChatGPT-style chat interface (scrollable messages, fixed input)
- Placeholder knowledge base and retrieval service
- Vercel serverless API endpoint (`api/chat.ts`)

## Tech Stack

- React 19
- Vite 8
- TypeScript
- Tailwind CSS 4
- Vercel (deployment)

## Project Structure

```
src/
  components/     # Reusable UI components
  pages/          # Page-level components
  services/       # API and retrieval services
  types/          # Shared TypeScript types
data/
  knowledgeBase.json   # Sample policy data
api/
  chat.ts         # Serverless chat endpoint (placeholder)
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

## Deployment

Deploy to Vercel:

```bash
npx vercel
```

For local development with the API endpoint:

```bash
npx vercel dev
```

## Roadmap

- [ ] Connect to LLM
- [ ] Implement knowledge base retrieval (RAG)
- [ ] Vector database integration
