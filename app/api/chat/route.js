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

// --- System-prompt leak guard (server-side, not just prompt rules) ---
// The "repeat the text above verbatim" style of attack bypasses prompt-level
// injection defenses, so block it here before it ever reaches the model.
const LEAK_PATTERNS = [
  /\bverbatim\b/i,
  /\b(echo|recite|reproduce|restate|rephrase|reiterate|reword)\b/i,
  /\bword\s*for\s*word\b/i,
  /\b(your|this)\s+(system\s+)?(prompt|instructions?|rules?)\b/i,
  /\bthe\s+system\s+prompt\b/i,
  /\b(the|that|this)\s+(text|prompt|message|conversation)\s+above\b/i,
  /\b(repeat|echo|copy|quote|output|print|show|reveal|leak|recite|reproduce|read\s*back|say\s*back|type\s*back)\b.{0,40}\b(text|prompt|instructions?|rules?|message|conversation|content|above|everything|all)\b/i,
]

function isLeakAttempt(text) {
  return LEAK_PATTERNS.some((re) => re.test(text))
}

// Backstop for novel phrasings the input guard misses: if streamed output
// starts reproducing the system prompt, abort the generation immediately.
const LEAK_MARKERS = [
  /# Non-negotiable rules/i,
  /# Ground truth/i,
  /# Deep dives/i,
  /You are KishGPT/i,
]

const REFUSAL_TEXT =
  'Sorry, I only answer questions about Kishan and his work. Ask me about his projects, skills, or experience!'

// Serve a blocked request as a normal bot reply using the same UI-message
// stream protocol the client expects (matches toUIMessageStreamResponse).
function refusalStream() {
  const frames = [
    { type: 'start' },
    { type: 'start-step' },
    { type: 'text-start', id: 'txt-0' },
    { type: 'text-delta', id: 'txt-0', delta: REFUSAL_TEXT },
    { type: 'text-end', id: 'txt-0' },
    { type: 'finish-step' },
    { type: 'finish', finishReason: 'stop' },
  ]
  const body =
    frames.map((f) => `data: ${JSON.stringify(f)}\n\n`).join('') +
    'data: [DONE]\n\n'
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

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

  // System-prompt leak guard: refuse repeat/verbatim/echo reveal attempts
  // before they reach the model.
  for (const m of messages) {
    if (m.role === 'user' && isLeakAttempt(m.content)) {
      return refusalStream()
    }
  }

  try {
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
    const modelName = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b'

    let leakedText = ''
    const controller = new AbortController()
    const result = streamText({
      model: groq(modelName),
      system: buildSystemPrompt(),
      messages,
      temperature: 0.4,
      maxOutputTokens: 600,
      abortSignal: controller.signal,
      onChunk({ chunk }) {
        if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
          leakedText += chunk.text
          if (LEAK_MARKERS.some((re) => re.test(leakedText))) {
            controller.abort()
          }
        }
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    console.error('Chat error:', err)
    return Response.json(
      { error: 'An error occurred while generating a response. Please try again.' },
      { status: 500 }
    )
  }
}
