import { createGroq } from '@ai-sdk/groq'
import { streamText } from 'ai'
import { buildSystemPrompt } from '@/lib/chatKnowledge'

export const runtime = 'nodejs'
export const maxDuration = 30

// Best-effort per-IP rate limit. Vercel serverless is per-instance, so this
// is a soft cap, not a hard one - good enough to stop casual abuse.
const RATE_LIMIT = 20 // messages per window
const RATE_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const rateHits = new Map()

function checkRateLimit(ip) {
  const now = Date.now()
  const entry = rateHits.get(ip)
  if (!entry || now > entry.resetAt) {
    rateHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  entry.count += 1
  if (entry.count > RATE_LIMIT) return false
  return true
}

function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return []
  const cleaned = []
  for (const m of raw.slice(-12)) {
    if (!m || typeof m !== 'object') continue
    const role = m.role === 'assistant' ? 'assistant' : 'user'
    let text = ''
    if (typeof m.content === 'string') {
      text = m.content
    } else if (Array.isArray(m.parts)) {
      text = m.parts
        .filter((p) => p && p.type === 'text' && typeof p.text === 'string')
        .map((p) => p.text)
        .join('')
    }
    text = text.trim().slice(0, 4000)
    if (!text) continue
    cleaned.push({ role, content: text })
  }
  return cleaned
}

export async function POST(req) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: 'Too many messages. Please wait a few minutes and try again.' },
      { status: 429 }
    )
  }

  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      { error: 'The chatbot is not configured yet. Add GROQ_API_KEY to the server environment.' },
      { status: 503 }
    )
  }

  let messages
  try {
    const body = await req.json()
    messages = sanitizeMessages(body.messages)
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }
  if (messages.length === 0) {
    return Response.json({ error: 'No message provided.' }, { status: 400 })
  }

  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
  const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

  const result = streamText({
    model: groq(modelName),
    system: buildSystemPrompt(),
    messages,
    temperature: 0.4,
    maxOutputTokens: 600,
  })

  return result.toUIMessageStreamResponse()
}
