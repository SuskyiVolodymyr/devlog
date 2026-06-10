'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { buildAgentUrl, type AIActionKey } from '@/lib/constants'

// Actions whose output streams into a dedicated modal (vs the inline panel box)
export const MODAL_ACTIONS = ['prioritize', 'backlog-review', 'status-update'] as const
export type ModalActionKey = (typeof MODAL_ACTIONS)[number]

export type ModalStream = { text: string; visible: number; open: boolean }

const EMPTY_STREAM: ModalStream = { text: '', visible: 0, open: false }

const INITIAL_MODALS: Record<ModalActionKey, ModalStream> = {
  'prioritize': EMPTY_STREAM,
  'backlog-review': EMPTY_STREAM,
  'status-update': EMPTY_STREAM,
}

function isModalAction(action: AIActionKey): action is ModalActionKey {
  return (MODAL_ACTIONS as readonly string[]).includes(action)
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Typewriter speed: slow while tokens arrive, fast drain once the stream ends
const STREAM_CHARS_PER_FRAME = 4
const DRAIN_CHARS_PER_FRAME = 20
// Generous enough for multi-step agentic loops over SSE
const REQUEST_TIMEOUT_MS = 90_000

/**
 * Owns the full agent-call lifecycle: SSE parsing, per-frame render batching,
 * typewriter animation state, and the decompose clarification handshake.
 * Components consume the state and render — no streaming logic in JSX.
 */
export function useAgentStream(taskId?: string, onRefresh?: () => void) {
  const [loading, setLoading] = useState<AIActionKey | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [activeAction, setActiveAction] = useState<AIActionKey | null>(null)
  const [response, setResponse] = useState('')
  const [awaitingClarification, setAwaitingClarification] = useState(false)
  const [modals, setModals] = useState<Record<ModalActionKey, ModalStream>>(INITIAL_MODALS)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  // Tick elapsed seconds while a request is in flight (reset happens in callAgent)
  useEffect(() => {
    if (loading === null) return
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [loading])

  // Typewriter — one rAF loop advances every animating modal.
  // Reduced-motion users get the full text in a single step.
  useEffect(() => {
    const animating = MODAL_ACTIONS.some((k) => modals[k].visible < modals[k].text.length)
    if (!animating) return

    const step = prefersReducedMotion()
      ? Number.MAX_SAFE_INTEGER
      : loading === null ? DRAIN_CHARS_PER_FRAME : STREAM_CHARS_PER_FRAME

    const id = requestAnimationFrame(() =>
      setModals((prev) => {
        const next = { ...prev }
        for (const k of MODAL_ACTIONS) {
          const m = next[k]
          if (m.visible < m.text.length) {
            next[k] = { ...m, visible: Math.min(m.visible + step, m.text.length) }
          }
        }
        return next
      })
    )
    return () => cancelAnimationFrame(id)
  }, [modals, loading])

  const setModalOpen = useCallback((key: ModalActionKey, open: boolean) => {
    setModals((prev) => ({ ...prev, [key]: { ...prev[key], open } }))
  }, [])

  async function callAgent(action: AIActionKey, body?: Record<string, string>) {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const timeout = setTimeout(() => abortRef.current?.abort(), REQUEST_TIMEOUT_MS)

    setLoading(action)
    setElapsed(0)
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
        let message: string
        try {
          const json = JSON.parse(rawText) as { error?: string }
          message = `Error: ${json.error ?? 'Something went wrong'}`
        } catch {
          message = `Error: ${res.status} ${res.statusText}`
        }
        if (isModalAction(action)) {
          setModals((prev) => ({ ...prev, [action]: { ...prev[action], text: message } }))
        } else {
          setResponse(message)
        }
        return
      }

      const contentType = res.headers.get('content-type') ?? ''

      if (contentType.includes('text/event-stream')) {
        const reader = res.body?.getReader()
        if (!reader) return
        const decoder = new TextDecoder()
        let accumulated = ''
        let rafId: number | null = null

        // Batch state updates to one per animation frame — no per-token re-renders
        const flush = () => {
          rafId = null
          const snapshot = accumulated
          if (isModalAction(action)) {
            setModals((prev) => ({ ...prev, [action]: { ...prev[action], text: snapshot } }))
          } else {
            setResponse(snapshot)
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') break
            if (data.startsWith('[ERROR] ')) {
              if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
              accumulated = `Error: ${data.slice(8)}`
              break
            }
            try {
              accumulated += (JSON.parse(data) as { d: string }).d
            } catch {
              accumulated += data
            }
            if (rafId === null) rafId = requestAnimationFrame(flush)
          }
        }
        // Final flush — pick up any tokens not yet committed
        if (rafId !== null) cancelAnimationFrame(rafId)
        flush()
        rawText = accumulated
      } else {
        rawText = await res.text()
      }

      // Modal actions already streamed into their modal — nothing left to route
      if (isModalAction(action)) return

      const responseText = (() => {
        try {
          const json = JSON.parse(rawText) as { result?: string; needsClarification?: boolean }
          if (action === 'decompose') {
            handleClarificationState(json.needsClarification ?? rawText.trimEnd().endsWith('?'))
          }
          return json.result ?? rawText
        } catch {
          // Plain text / SSE accumulated string
          if (action === 'decompose') {
            handleClarificationState(rawText.trimEnd().endsWith('?'))
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
      const message = err instanceof Error && err.name === 'AbortError'
        ? 'Request timed out or cancelled. Please try again.'
        : `Error: ${err instanceof Error ? err.message : 'Network error'}`
      if (isModalAction(action)) {
        setModals((prev) => ({ ...prev, [action]: { ...prev[action], text: message } }))
      } else {
        setResponse(message)
      }
    } finally {
      clearTimeout(timeout)
      setLoading(null)
    }
  }

  function handleClarificationState(needsClarification: boolean) {
    if (needsClarification) {
      setAwaitingClarification(true)
    } else {
      setAwaitingClarification(false)
      onRefresh?.()
    }
  }

  function runAction(action: AIActionKey) {
    setActiveAction(action)
    setAwaitingClarification(false)
    if (isModalAction(action)) {
      setModals((prev) => ({ ...prev, [action]: { text: '', visible: 0, open: true } }))
    }
    callAgent(action)
  }

  function sendClarification(clarification: string) {
    if (!clarification.trim()) return
    callAgent('decompose', { clarification: clarification.trim() })
  }

  return {
    loading,
    elapsed,
    activeAction,
    response,
    awaitingClarification,
    modals,
    runAction,
    sendClarification,
    setModalOpen,
  }
}
