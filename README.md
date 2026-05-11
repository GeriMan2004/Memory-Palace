# Memory Palace

Single-screen memory game built with Next.js App Router.

## Stack

- Next.js 16 + React + TypeScript
- Tailwind CSS
- Hugging Face Inference / Router for:
  - route step text generation
  - per-stop image generation

## Core flow

1. User picks item count and fills ordered items.
2. Client requests `/api/palace-route` progressively (one stop at a time).
3. After each stop, client requests `/api/palace-image` for that specific stop.
4. User studies the built route and enters recall mode.
5. Recall runs one answer at a time and ends with scored results.

## Key files

- `app/page.tsx`: app entrypoint
- `components/memory-palace-app.tsx`: orchestration and game state machine
- `components/palace/`: phase UI, route chips, shared primitives
- `app/api/palace-route/route.ts`: Hugging Face step-route generation
- `app/api/palace-image/route.ts`: Hugging Face scene image generation
- `lib/palace-schema.ts`: zod schemas + response parsing/normalization
- `lib/palace-prompts.ts`: route-step prompt and image prompt builders

## Environment variables

Set at least one token variable:

- `HF_TOKEN`
- or `HF_API_TOKEN`
- or `HUGGING_FACE_HUB_TOKEN`

Optional:

- `HF_DEBUG=true` to log route generation diagnostics server-side.

## Development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm run build
```
