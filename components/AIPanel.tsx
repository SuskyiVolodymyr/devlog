'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AI_ACTIONS, type AIActionKey } from '@/lib/constants'
import { useAgentStream } from '@/lib/hooks/useAgentStream'
import AgentModal from '@/components/AgentModal'
import {
  proseBefore,
  parsePrioritizeRef,
  parseFlaggedRefs,
  PRIORITIZE_SENTINEL,
  FLAGGED_SENTINEL,
} from '@/lib/agents/output'

const SPARKLES_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
  </svg>
)

const CLIPBOARD_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
  </svg>
)

const CHAT_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
  </svg>
)

interface AgentFabProps {
  onClick: () => void
  label: string
  icon: React.ReactNode
  className: string
}

function AgentFab({ onClick, label, icon, className }: AgentFabProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`fixed right-6 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg transition-all duration-200 hover:shadow-xl ${className}`}
    >
      {icon}
      {label}
    </button>
  )
}

interface AIPanelProps {
  taskId?: string
  onRefresh?: () => void
}

export default function AIPanel({ taskId, onRefresh }: AIPanelProps) {
  const router = useRouter()
  const {
    loading, elapsed, activeAction, response, awaitingClarification,
    modals, runAction, sendClarification, setModalOpen,
  } = useAgentStream(taskId, onRefresh)

  const [clarification, setClarification] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const clarificationRef = useRef<HTMLTextAreaElement>(null)

  // Escape closes the expanded panel-response modal (AgentModal handles its own)
  useEffect(() => {
    if (!expanded) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  // Auto-focus clarification textarea when it appears
  useEffect(() => {
    if (awaitingClarification && !loading) {
      clarificationRef.current?.focus()
    }
  }, [awaitingClarification, loading])

  function handleRun(action: AIActionKey) {
    setClarification('')
    if (action === 'status-update') setCopyState('idle')
    runAction(action)
  }

  function handleSendClarification() {
    sendClarification(clarification)
  }

  function copyStatusUpdate() {
    // Slack renders *single asterisks* as bold
    navigator.clipboard.writeText(modals['status-update'].text.replace(/\*\*/g, '*'))
      .then(() => setCopyState('copied'))
      .catch(() => setCopyState('failed'))
    setTimeout(() => setCopyState('idle'), 2000)
  }

  const visibleActions = AI_ACTIONS.filter((a) => {
    if (a.taskOnly && !taskId) return false
    if (a.boardOnly && !!taskId) return false
    return true
  })

  // Per-modal derived view state: typewriter slice, prose split, parsed refs
  const pri = modals['prioritize']
  const priStreaming = pri.visible < pri.text.length
  const priDisplay = proseBefore(pri.text.slice(0, pri.visible), PRIORITIZE_SENTINEL)
  const priRef = !priStreaming ? parsePrioritizeRef(pri.text) : null

  const backlog = modals['backlog-review']
  const backlogStreaming = backlog.visible < backlog.text.length
  const backlogDisplay = proseBefore(backlog.text.slice(0, backlog.visible), FLAGGED_SENTINEL)
  const flaggedRefs = !backlogStreaming ? parseFlaggedRefs(backlog.text) : []

  const status = modals['status-update']
  const statusStreaming = status.visible < status.text.length
  const statusDisplay = status.text.slice(0, status.visible)

  return (
    <>
    <aside className="flex flex-col gap-4 rounded-xl border border-zinc-700/60 bg-zinc-800/40 p-4">
      <div className="flex items-center gap-2">
        {SPARKLES_ICON}
        <h2 className="text-sm font-semibold text-zinc-200">AI Assistant</h2>
      </div>

      <div className="flex flex-col gap-2">
        {visibleActions.map((action) => (
          <button
            key={action.key}
            onClick={() => handleRun(action.key)}
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
                onClick={handleSendClarification}
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

    {/* Expanded view of the inline panel response */}
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

    {/* Prioritize modal */}
    <AgentModal
      open={pri.open}
      title="Prioritize"
      icon={SPARKLES_ICON}
      spinnerClass="text-blue-400"
      loadingLabel="Analyzing tasks…"
      busyLabel="Thinking…"
      text={priDisplay}
      isStreaming={priStreaming}
      busy={loading !== null}
      onClose={() => setModalOpen('prioritize', false)}
    >
      {priRef && (
        <div className="mx-5 mb-4 flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-3">
          <div className="min-w-0">
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">Start here</p>
            <p className="truncate text-sm font-medium text-zinc-100">{priRef.title}</p>
          </div>
          <button
            onClick={() => { router.push(`/tasks/${priRef.id}`); setModalOpen('prioritize', false) }}
            className="ml-4 shrink-0 rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-600 hover:text-white"
          >
            Open →
          </button>
        </div>
      )}
    </AgentModal>

    {/* Backlog review modal */}
    <AgentModal
      open={backlog.open}
      title="Backlog Review"
      icon={CLIPBOARD_ICON}
      spinnerClass="text-amber-400"
      loadingLabel="Reviewing backlog…"
      busyLabel="Reviewing…"
      text={backlogDisplay}
      isStreaming={backlogStreaming}
      busy={loading !== null}
      onClose={() => setModalOpen('backlog-review', false)}
    >
      {flaggedRefs.length > 0 && (
        <div className="mx-5 mb-4 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Needs attention</p>
          <div className="flex flex-wrap gap-2">
            {flaggedRefs.map((t) => (
              <button
                key={t.id}
                onClick={() => { router.push(`/tasks/${t.id}`); setModalOpen('backlog-review', false) }}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-white"
              >
                {t.title} →
              </button>
            ))}
          </div>
        </div>
      )}
    </AgentModal>

    {/* Status update modal */}
    <AgentModal
      open={status.open}
      title="Status Update"
      icon={CHAT_ICON}
      spinnerClass="text-emerald-400"
      loadingLabel="Drafting update…"
      busyLabel="Drafting…"
      text={statusDisplay}
      isStreaming={statusStreaming}
      busy={loading !== null}
      onClose={() => setModalOpen('status-update', false)}
      footerExtra={
        <button
          onClick={copyStatusUpdate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          {copyState === 'copied' ? 'Copied ✓' : copyState === 'failed' ? 'Copy failed' : 'Copy for Slack'}
        </button>
      }
    />

    {/* FABs — re-open dismissed results */}
    {pri.text && !pri.open && loading === null && (
      <AgentFab
        onClick={() => setModalOpen('prioritize', true)}
        label="Today's focus"
        icon={<span className="[&>svg]:text-white">{SPARKLES_ICON}</span>}
        className="bottom-6 bg-blue-600 text-white hover:bg-blue-500"
      />
    )}
    {backlog.text && !backlog.open && loading === null && (
      <AgentFab
        onClick={() => setModalOpen('backlog-review', true)}
        label="Backlog review"
        icon={CLIPBOARD_ICON}
        className={`bg-zinc-700 text-zinc-100 hover:bg-zinc-600 ${pri.text && !pri.open ? 'bottom-20' : 'bottom-6'}`}
      />
    )}
    {status.text && !status.open && loading === null && (
      <AgentFab
        onClick={() => setModalOpen('status-update', true)}
        label="Status update"
        icon={CHAT_ICON}
        className="bottom-6 bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
      />
    )}
    </>
  )
}
