# Kishan S G — Cinematic Portfolio

A cinematic, single-page Next.js portfolio for **Kishan S G**, a final-year B.Tech IT student and full-stack AI engineer building production AI systems — multi-agent platforms, computer vision pipelines, and full-stack products that ship.

**Live site:** https://kishan-sg-portfolio.vercel.app
**Author:** Kishan S G — kishansg02@gmail.com

## Projects

- **KadaiGPT** — multi-tenant POS PWA for India's 15M+ kirana stores: real-time billing, inventory, customer credit ledger with risk scoring, GST tax reports, a WhatsApp storefront bot, and Gemini Vision OCR. Python / FastAPI / React 19 / Supabase PostgreSQL / Vercel Serverless / PWA.
- **SmartDetect** — universal camera-based detection system: multi-model pipeline (YOLOv8, InsightFace, DeepSORT, OSNet Re-ID) with pgvector face embeddings, 90%+ accuracy, night and crowd detection improvements, and a real-time operator dashboard.
- **AkkaKadai** — food storefront for a real client with UPI payments and AI-based seller document verification (in development).
- **Jarvis** — voice-command personal assistant with remote PC control through a Telegram bot and headless browser automation.

## Stack

- Next.js 16 (Turbopack) + React 19
- GSAP animations + Three.js cinematic layer
- Tailwind CSS v4 + shadcn/base-ui components
- Chatbot: Vercel AI SDK (`ai`, `@ai-sdk/groq`, `@ai-sdk/react`) streaming to Groq

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

## KishGPT — the portfolio chatbot

A floating chat widget that answers visitor and recruiter questions about Kishan's background, projects, and how to reach him. Answers are grounded only in the portfolio data, streamed live from Groq, with source citations, refusal handling, and a per-IP rate limit.

**Environment variables:**

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GROQ_API_KEY` | yes | — | Groq API key for chat streaming |
| `GROQ_MODEL` | no | `llama-3.3-70b-versatile` | Chat model override |

Put the key in `.env.local` for local development, and add it to the Vercel project env vars (Production) for the live site.

**Key files:**

- `app/api/chat/route.js` — streaming API route (rate limit, message sanitizing, Groq call)
- `lib/chatKnowledge.js` — the knowledge base + system prompt (grounded in `data/profile.json`)
- `components/ui/ChatWidget.jsx` — the chat widget UI
- `styles/ui/ChatWidget.module.css` — widget styling

To add facts the bot can answer, edit `lib/chatKnowledge.js` — never rely on the model inventing anything.

## Main content files

- `data/profile.json` — profile, experience, projects, skills, achievements, socials
- `data/content.json` — section labels, hero pills, and footer copy
- `public/assets/` — hero/footer imagery and project card mockups
- `public/certificates/` — certificate PDFs

## Deploy

Deploys are manual — Vercel is not connected to GitHub:

```bash
vercel --prod --yes
```

See `PROJECT_NOTES.md` for the redeploy routine and project history.
