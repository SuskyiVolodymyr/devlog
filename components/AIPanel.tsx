'use client'

import { useState } from 'react'

interface AIPanelProps {
  taskId?: string
  onRefresh?: () => void
}

type ActionKey = 'prioritize' | 'decompose' | 'status-update'

interface Action {
  key: ActionKey
  label: string
  description: string
  taskOnly?: boolean
}

const ACTIONS: Action[] = [
  {
    key: 'prioritize',
    label: 'Prioritize',
    description: 'Recommend where to start based on all tasks',
  },
  {
    key: 'decompose',
    label: 'Decompose',
    description: 'Break this task into subtasks',
    taskOnly: true,
  },
  {
    key: 'status-update',
    label: 'Status Update',
    description: 'Draft a Slack-style update for this task',
    taskOnly: true,
  },
]

function buildUrl(action: ActionKey, taskId?: string): string {
  if (action === 'prioritize') return '/api/ai/prioritize'
  if (action === 'decompose') return `/api/ai/decompose/${taskId}`
  return `/api/ai/status-update/${taskId}`
}

export default function AIPanel({ taskId, onRefresh }: AIPanelProps) {
  const [loading, setLoading] = useState<ActionKey | null>(null)
  const [response, setResponse] = useState<string>('')
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null)
  const [clarification, setClarification] = useState('')
  const [awaitingClarification, setAwaitingClarification] = useState(false)

  async function callAgent(action: ActionKey, body?: Record<string, string>) {
    setLoading(action)
    setResponse('')

    try {
      const res = await fetch(buildUrl(action, taskId), {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      })

      let text: string
      if (!res.ok) {
        // Safely read the error body — it may be HTML or plain text
        text = await res.text()
        try {
          const json = JSON.parse(text) as { error?: string }
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
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break
              accumulated += data
              setResponse(accumulated)
            }
          }
        }
        text = accumulated
      } else {
        text = await res.text()
        try {
          const json = JSON.parse(text) as { result?: string }
          text = json.result ?? text
        } catch {
          // plain text response
        }
        setResponse(text)
      }

      // Decompose agent may return a clarifying question instead of creating subtasks
      if (action === 'decompose' && text.trimEnd().endsWith('?')) {
        setAwaitingClarification(true)
      } else {
        setAwaitingClarification(false)
        setClarification('')
        if (action === 'decompose') onRefresh?.()
      }
    } catch (err) {
      setResponse(`Error: ${err instanceof Error ? err.message : 'Network error'}`)
    } finally {
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

  const visibleActions = ACTIONS.filter((a) => !a.taskOnly || !!taskId)

  return (
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
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <svg className="h-4 w-4 animate-spin text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running {ACTIONS.find((a) => a.key === activeAction)?.label}…
            </div>
          )}

          {response && (
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
              <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-300">
                {response}
              </p>
            </div>
          )}

          {/* Clarification input — shown when decompose agent asks a question */}
          {awaitingClarification && loading === null && (
            <div className="flex flex-col gap-2">
              <textarea
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
  )
}
