'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { FaCommentDots, FaTimes, FaPaperPlane, FaRegCopy, FaCheck, FaTrash } from 'react-icons/fa'
import styles from '@/styles/ui/ChatWidget.module.css'

const SUGGESTIONS = [
  'What projects has Kishan built?',
  'Tell me about SmartDetect',
  "What's his tech stack?",
  'How do I contact him?',
]

// --- Minimal inline renderer (bold, code, links) ---
function renderInline(text, keyPrefix) {
  const parts = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s]+)/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const tok = m[0]
    const key = `${keyPrefix}-${m.index}`
    if (tok.startsWith('**')) {
      parts.push(<strong key={key}>{tok.slice(2, -2)}</strong>)
    } else if (tok.startsWith('`')) {
      parts.push(<code key={key}>{tok.slice(1, -1)}</code>)
    } else {
      parts.push(
        <a key={key} href={tok} target="_blank" rel="noreferrer">
          {tok}
        </a>
      )
    }
    last = m.index + tok.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function renderText(text, keyPrefix) {
  const lines = text.split('\n')
  const blocks = []
  let list = null
  let listType = null

  const flush = () => {
    if (!list) return
    const items = list
    blocks.push(
      listType === 'ol' ? (
        <ol key={`${keyPrefix}-list-${blocks.length}`}>
          {items.map((li, i) => (
            <li key={i}>{li}</li>
          ))}
        </ol>
      ) : (
        <ul key={`${keyPrefix}-list-${blocks.length}`}>
          {items.map((li, i) => (
            <li key={i}>{li}</li>
          ))}
        </ul>
      )
    )
    list = null
    listType = null
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/)
    const num = line.match(/^\d+\.\s+(.*)$/)
    if (bullet) {
      if (listType !== 'ul') {
        flush()
        listType = 'ul'
        list = []
      }
      list.push(renderInline(bullet[1], `${keyPrefix}-b${list.length}`))
    } else if (num) {
      if (listType !== 'ol') {
        flush()
        listType = 'ol'
        list = []
      }
      list.push(renderInline(num[1], `${keyPrefix}-n${list.length}`))
    } else {
      flush()
      const isSource = /^Source:/i.test(line)
      blocks.push(
        <p key={`${keyPrefix}-p${blocks.length}`} className={isSource ? styles.source : undefined}>
          {renderInline(line, `${keyPrefix}-p${blocks.length}`)}
        </p>
      )
    }
  }
  flush()
  return blocks
}

function messageText(msg) {
  if (typeof msg.content === 'string' && msg.content) return msg.content
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p) => p && p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('')
  }
  return ''
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    api: '/api/chat',
  })

  const busy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, status])

  const submit = (text) => {
    const value = (text ?? input).trim()
    if (!value || busy) return
    setInput('')
    sendMessage({ text: value })
  }

  const copyMessage = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // Clipboard unavailable - ignore
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.launcher}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Chat with the portfolio bot'}
        aria-expanded={open}
      >
        {open ? <FaTimes size={20} /> : <FaCommentDots size={22} />}
      </button>

      {open && (
        <section className={styles.panel} aria-label="Portfolio chatbot">
          <header className={styles.header}>
            <div className={styles.headerInfo}>
              <span className={styles.avatar}>K</span>
              <div>
                <p className={styles.title}>KishGPT</p>
                <p className={styles.subtitle}>
                  <span className={styles.dot} /> Ask about Kishan&apos;s work
                </p>
              </div>
            </div>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setMessages([])}
              aria-label="Clear conversation"
              title="Clear conversation"
            >
              <FaTrash size={14} />
            </button>
          </header>

          <div className={styles.messages} ref={scrollRef} role="log" aria-live="polite">
            {messages.length === 0 && (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>Hi, I&apos;m KishGPT</p>
                <p className={styles.emptyText}>
                  I answer questions about Kishan S G, his projects, and how to reach him.
                  Everything I say is grounded in his portfolio, with sources.
                </p>
                <div className={styles.chips}>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={styles.chip}
                      onClick={() => submit(s)}
                      disabled={busy}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const text = messageText(msg)
              if (!text) return null
              const isUser = msg.role === 'user'
              return (
                <div key={msg.id || i} className={`${styles.row} ${isUser ? styles.userRow : styles.botRow}`}>
                  {!isUser && <span className={styles.botAvatar}>K</span>}
                  <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.botBubble}`}>
                    {renderText(text, msg.id || i)}
                    {!isUser && (
                      <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={() => copyMessage(msg.id || i, text)}
                        aria-label="Copy answer"
                        title="Copy answer"
                      >
                        {copiedId === (msg.id || i) ? <FaCheck size={11} /> : <FaRegCopy size={11} />}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {busy && (
              <div className={`${styles.row} ${styles.botRow}`}>
                <span className={styles.botAvatar}>K</span>
                <div className={`${styles.bubble} ${styles.botBubble}`}>
                  <span className={styles.typing}>
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            )}

            {error && !busy && (
              <p className={styles.error}>
                {error.message || 'Something went wrong. Please try again.'}
              </p>
            )}
          </div>

          <footer className={styles.footer}>
            {busy && (
              <button type="button" className={styles.stopBtn} onClick={() => stop()}>
                Stop generating
              </button>
            )}
            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
            >
              <textarea
                ref={inputRef}
                className={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submit()
                  }
                }}
                placeholder="Ask about Kishan, his projects, his stack..."
                rows={1}
                disabled={busy}
                aria-label="Message"
              />
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={busy || !input.trim()}
                aria-label="Send message"
              >
                <FaPaperPlane size={15} />
              </button>
            </form>
            <p className={styles.disclaimer}>Answers are grounded in the portfolio and may cite sources.</p>
          </footer>
        </section>
      )}
    </>
  )
}
