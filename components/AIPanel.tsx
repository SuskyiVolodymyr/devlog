'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AI_ACTIONS, buildAgentUrl, type AIActionKey } from '@/lib/constants'

type ActionKey = AIActionKey

interface AIPanelProps {
  taskId?: string
  onRefresh?: () => void
}

export default function AIPanel({ taskId, onRefresh }: AIPanelProps) {
  const [loading, setLoading] = useState<ActionKey | null>(null)
  const [response, setResponse] = useState<string>('')
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null)
  const [clarification, setClarification] = useState('')
  const [awaitingClarification, setAwaitingClarification] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const clarificationRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  useEffect(() => {
    if (!expanded) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  // Tick elapsed seconds while a request is in flight
  useEffect(() => {
    if (loading === null) { setElapsed(0); return }
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [loading])

  // Auto-focus clarification textarea when it appears
  useEffect(() => {
    if (awaitingClarification && !loading) {
      clarificationRef.current?.focus()
    }
  }, [awaitingClarification, loading])

  async function callAgent(action: ActionKey, body?: Record<string, string>) {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    // 90s — generous enough for multi-step agentic loops over SSE
    const timeout = setTimeout(() => abortRef.current?.abort(), 90_000)

    setLoading(action)
    setResponse('')

    try {
      const res = await fetch(buildAgentUrl(action, taskId), {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
        signal: abortRef.current.signal,
      })

      let rawText: string
      if (!res.ok) {
        // Safely read the error body — it may be HTML or plain text
        rawText = await res.text()
        try {
          const json = JSON.parse(rawText) as { error?: string }
          setResponse(`Error: ${json.error ?? 'Something went wrong'}`)
        } catch {
          setResponse(`Error: ${res.status} ${res.statusText}`)
        }
        return
      }

      const contentType = res.headers.get('content-type') ?? ''

      if (contentType.includes('text/event-stream')) {
        const reader = res.body?.getReader()
        if (!reader) return
        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') break
            if (data.startsWith('[ERROR] ')) {
              accumulated = `Error: ${data.slice(8)}`
              setResponse(accumulated)
              break
            }
            try {
              // JSON-encoded delta: {"d":"..."}
              accumulated += (JSON.parse(data) as { d: string }).d
            } catch {
              accumulated += data
            }
            setResponse(accumulated)
          }
        }
        rawText = accumulated
      } else {
        rawText = await res.text()
      }

      const responseText = (() => {
        try {
          const json = JSON.parse(rawText) as { result?: string; needsClarification?: boolean }
          // For decompose, prefer explicit field, fall back to heuristic
          if (action === 'decompose') {
            const needsClarification = json.needsClarification ?? rawText.trimEnd().endsWith('?')
            if (needsClarification) {
              setAwaitingClarification(true)
            } else {
              setAwaitingClarification(false)
              setClarification('')
              onRefresh?.()
            }
          }
          return json.result ?? rawText
        } catch {
          // Plain text / SSE accumulated string
          if (action === 'decompose') {
            const needsClarification = rawText.trimEnd().endsWith('?')
            if (needsClarification) {
              setAwaitingClarification(true)
            } else {
              setAwaitingClarification(false)
              setClarification('')
              onRefresh?.()
            }
          }
          return rawText
        }
      })()

      if (!responseText.trim()) {
        setResponse('No response from agent. Please try again.')
      } else {
        setResponse(responseText)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setResponse('Request timed out or cancelled. Please try again.')
      } else {
        setResponse(`Error: ${err instanceof Error ? err.message : 'Network error'}`)
      }
    } finally {
      clearTimeout(timeout)
      setLoading(null)
    }
  }

  function runAction(action: ActionKey) {
    setActiveAction(action)
    setAwaitingClarification(false)
    setClarification('')
    callAgent(action)
  }

  function sendClarification() {
    if (!clarification.trim()) return
    callAgent('decompose', { clarification: clarification.trim() })
  }

  const visibleActions = AI_ACTIONS.filter((a) => {
    if (a.taskOnly && !taskId) return false
    if (a.boardOnly && !!taskId) return false
    return true
  })

  return (
    <>
    <aside className="flex flex-col gap-4 rounded-xl border border-zinc-700/60 bg-zinc-800/40 p-4">
      <div className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
        </svg>
        <h2 className="text-sm font-semibold text-zinc-200">AI Assistant</h2>
      </div>

      <div className="flex flex-col gap-2">
        {visibleActions.map((action) => (
          <button
            key={action.key}
            onClick={() => runAction(action.key)}
            disabled={loading !== null}
            className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              activeAction === action.key && !loading
                ? 'border-blue-600/60 bg-zinc-700/80'
                : 'border-zinc-700 bg-zinc-800 hover:border-blue-600/60 hover:bg-zinc-700/80'
            }`}
          >
            <span className="text-sm font-medium text-zinc-200">{action.label}</span>
            <span className="text-xs text-zinc-500">{action.description}</span>
          </button>
        ))}
      </div>

      {(loading !== null || response) && (
        <div className="flex flex-col gap-3">
          {loading !== null && (
            <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-zinc-400">
              <svg className="h-4 w-4 animate-spin text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>
                Running {AI_ACTIONS.find((a) => a.key === activeAction)?.label}…
                {elapsed > 3 && <span className="ml-1 tabular-nums text-zinc-500">{elapsed}s</span>}
              </span>
            </div>
          )}

          {response && (
            <div className="rounded-lg border border-zinc-700 bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
                <span className="text-xs text-zinc-500">{AI_ACTIONS.find((a) => a.key === activeAction)?.label}</span>
                <button
                  onClick={() => setExpanded(true)}
                  aria-label="Expand response"
                  className="rounded p-0.5 text-zinc-600 transition-colors hover:text-zinc-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-zinc-300">
                {response}
              </p>
            </div>
          )}

          {/* Clarification input — shown when decompose agent asks a question */}
          {awaitingClarification && loading === null && (
            <div className="flex flex-col gap-2">
              <textarea
                ref={clarificationRef}
                value={clarification}
                onChange={(e) => setClarification(e.target.value)}
                placeholder="Your answer…"
                rows={2}
                className="resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={sendClarification}
                disabled={!clarification.trim()}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send clarification
              </button>
            </div>
          )}
        </div>
      )}
    </aside>

    {expanded && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        onClick={() => setExpanded(false)}
      >
        <div
          className="flex w-full max-w-3xl flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
            <span className="text-sm font-semibold text-zinc-200">
              {AI_ACTIONS.find((a) => a.key === activeAction)?.label}
            </span>
            <button
              onClick={() => setExpanded(false)}
              aria-label="Close"
              className="rounded p-1 text-zinc-500 transition-colors hover:text-zinc-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-5 pb-5">
            <p className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-zinc-300">
              {response}
            </p>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
