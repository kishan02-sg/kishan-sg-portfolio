# Portfolio — project notes

Kishan's personal cinematic portfolio, reskinned from the `cinematic-portfolio-main`
template. **Status: not actively used (Kishan, 2026-07-07).**

## Facts

- **Stack:** Next.js 16.2.6 (Turbopack) + React 19 + GSAP + Three.js
- **Live:** https://kishan-sg-portfolio.vercel.app
- **GitHub:** https://github.com/kishan02-sg/kishan-sg-portfolio
- **Vercel:** project `kishan02-sgs-projects/kishan-sg-portfolio`
- **Dev server:** port 3000 (`npm run dev`)
- All four project cards are HTML mockups rendered via headless Chrome
  (`project-*-vN.png` in `public/assets/`). AkkaKadai's is the exception: it's a
  real screenshot of the live site. KadaiGPT was a login-screen screenshot until
  2026-07-16 → now a POS dashboard mockup (`project-kadaigpt-v3.png`), because the
  live app opens on a sign-in form.

## Chatbot (KishGPT)

- Stack: Vercel AI SDK (`ai` + `@ai-sdk/groq` + `@ai-sdk/react`) streaming to
  Groq. Files: `app/api/chat/route.js`, `components/ui/ChatWidget.jsx`,
  `styles/ui/ChatWidget.module.css`, `lib/chatKnowledge.js`.
- **Env var: `GROQ_API_KEY`** (required) and optional `GROQ_MODEL` (default
  `qwen/qwen3.8-27b`). Put the key in `.env.local` for local dev and in
  the Vercel project env vars for the live site (Settings → Environment Variables).
- The bot answers ONLY from `lib/chatKnowledge.js` (built from `data/profile.json`
  + hand-written deep dives). If a fact is missing there, add it there — never in
  the model.
- Rate limit: 20 messages per 10 min per IP, best-effort in-memory (per serverless instance).
- System-prompt leak guard in `app/api/chat/route.js`: blocks repeat/verbatim/echo
  reveal attempts server-side (never reaches the model) and aborts generation if
  streamed output starts reproducing the prompt (backstop).

## Hard rules

1. **Deploys are manual.** Vercel is NOT connected to GitHub — after pushing, run
   `vercel --prod --yes` from this folder, or the live site silently stays stale.
2. **Bump the asset version suffix** (`-v2` → `-v3`) in filename AND every
   reference whenever swapping media, or browsers serve the old file.
3. **Real work only on project cards** — nothing fabricated on a public page.

## Redeploy routine

1. Verify locally on port 3000 (check phone width + both color schemes if layout changed).
2. Cache-bust any swapped media (rule 2).
3. Commit and push to `main`.
4. `vercel --prod --yes` from this folder — this is what updates the live site.
5. Hard-refresh the live URL and confirm.

## Gotchas

- ffmpeg is not on PATH — use the pip-bundled binary under `imageio_ffmpeg`
  (`...\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe`).
  Used `delogo` to strip the Gemini/Veo sparkle from intro + footer videos.
- If `vercel` prompts for scope/link: re-link to the existing project, don't create a new one.

## History

### 2026-06-23
Last commit to date (5 commits total).

### 2026-06-14 (approx.)
Site live after heavy customization; watermarks stripped from videos; deployed
manually via `vercel --prod --yes`.
