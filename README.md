# Littly

**Thoughtful AI guidance for every little question.**

Littly is a custom frontend/interface for an AI-powered infant
information assistant. The user interacts only with the Littly
interface: their question is sent securely from our backend to the Gemini
API, Gemini generates the response, and the response is displayed inside
our own UI. Users are never redirected to Gemini, Google AI Studio, or any
external chatbot.

> Littly provides general information and is not a substitute for
> professional medical advice or emergency care.

## Features

- ChatGPT-style chat interface: sidebar with saved chats, main
  conversation view, and a composer box fixed at the bottom — no scrolling
  up to ask again
- Multi-turn follow-ups: prior turns are sent to Gemini as conversation
  context (last 10 turns, validated server-side)
- Chat history stored in the browser (localStorage, this device only):
  auto-titled chats, reopen old chats, delete chats, "New chat" button
- Optional baby-age selector (Newborn → 1–2 years), locked per chat and
  sent as AI context
- Large question input with validation (empty / over-length rejected)
- Rich answer rendering (headings, bold, lists) with per-message actions:
  copy, quote-and-reply (uses your text selection when present),
  regenerate response, and thumbs up/down feedback saved with the chat
- Loading state (typing indicator), error state with retry, empty state
  with suggested questions, smart auto-scroll with scroll-to-bottom button
- Server-side Gemini integration — API key never reaches the browser
- Soft neutral/pastel visual system, responsive with mobile sidebar drawer
- Accessible: semantic HTML, labels, focus states, `role="alert"` /
  `aria-live` regions, keyboard support (Enter to send, Shift+Enter for
  new line)

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript (strict)
- Tailwind CSS 4
- Gemini API via the official `@google/genai` SDK (model: `gemini-2.5-flash`)
- `zod` for API request validation
- `lucide-react` icons

## Installation

```bash
npm install
```

## Environment variable setup

1. Copy the example file:

   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env.local
   ```

2. Add your key to `.env.local`:

   ```env
   GEMINI_API_KEY=your_key_here
   ```

   Never commit `.env.local`. Never put a real key in the repository.

## How to obtain a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Sign in with a Google account.
3. Create an API key.
4. Paste it into `.env.local` as `GEMINI_API_KEY`.
5. (Optional) Restrict the key in Google Cloud Console for production use.

## How to run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without `GEMINI_API_KEY`, the UI still runs; asking a question returns a
clear configuration error (detailed message only in development).

## How to build for production

```bash
npm run build
npm run start
```

Set `GEMINI_API_KEY` in your hosting provider's environment variables
(e.g. Vercel → Project Settings → Environment Variables).

## Architecture

```text
Browser (/)
  │  POST /api/chat  { question, babyAge, history[] }
  ▼
Next.js Route Handler (src/app/api/chat/route.ts)
  │  validate with zod → reject empty/invalid (400)
  │  read GEMINI_API_KEY server-side only
  ▼
Gemini helper (src/lib/babycare/gemini.ts)
  │  @google/genai → models.generateContent(gemini-2.5-flash,
  │    systemInstruction + prior turns + question + age context)
  ▼
{ answer } → appended to the conversation, saved to localStorage
```

Key files:

| Path | Purpose |
| ---- | ------- |
| `src/app/page.tsx` | Route entry (renders Littly) |
| `src/app/layout.tsx` | Root layout + metadata |
| `src/components/babycare/babycare-app.tsx` | Chat state machine + layout (sidebar/main/composer) |
| `src/components/babycare/sidebar.tsx` | Chat history list, new chat, delete |
| `src/components/babycare/composer.tsx` | Fixed bottom input with age selector |
| `src/components/babycare/chat-message.tsx` | Message bubbles, typing indicator, copy button |
| `src/components/babycare/markdown.tsx` | Lightweight safe answer renderer |
| `src/components/babycare/babycare-header.tsx` | Slim top bar |
| `src/app/api/chat/route.ts` | `POST /api/chat` validation + orchestration |
| `src/lib/babycare/gemini.ts` | Server-only Gemini call (never imported client-side) |
| `src/lib/babycare/storage.ts` | localStorage history (client-only) |
| `src/lib/babycare/constants.ts` | Model, ages, system instruction, copy |
| `src/types/babycare.ts` | Strict TypeScript types |
| `.env.example` | Required env var name (no secret) |

Security properties:

- `GEMINI_API_KEY` is read only in `src/lib/babycare/gemini.ts`, which is
  imported only by the server route. Client components use `fetch` and
  never see the key.
- Incoming requests are validated with `zod`; empty questions are
  rejected with a 400 before any Gemini call.
- Upstream error details are never forwarded to the client; the API key
  is never logged.
- No database, no auth, no personal data collection in this MVP.

## Current limitations

- Chat history lives in browser localStorage (this device only, not
  synced, cleared if site data is wiped).
- No streaming — responses arrive as one JSON payload.
- No image input, baby profiles, or milestone tracking.
- Answers depend on the Gemini model and may be imperfect; the assistant
  does not diagnose and must not be treated as a pediatrician.

## Future roadmap (not implemented)

Phase 2:

- Conversation history
- Better prompt management
- Trusted pediatric/public-health knowledge base
- RAG

Phase 3:

- Image input
- Baby profile
- Developmental milestones
- Structured safety checks

Phase 4:

- Evaluation framework
- Multiple model comparison
- Advanced safety/triage layer
- Production monitoring
