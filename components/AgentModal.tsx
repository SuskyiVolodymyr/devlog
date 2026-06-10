'use client'

import { useEffect, useRef } from 'react'

const CURSOR = (
  <span
    key="cursor"
    className="ml-0.5 inline-block h-[0.85em] w-0.5 align-middle"
    style={{ animation: 'blink 1s step-start infinite', background: 'rgb(161 161 170)' }}
  />
)

// Minimal renderer matched to what the agent prompts emit: **bold**, • / - bullets,
// and stripped [title](id) links. Anything richer belongs in the prompts first.
export function renderMarkdown(text: string, streaming = false): React.ReactNode {
  const elements: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []

  function inline(s: string, appendCursor = false) {
    const parts = s.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]*\))/).map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**'))
        return <strong key={i} className="font-semibold text-zinc-100">{p.slice(2, -2)}</strong>
      const linkMatch = p.match(/^\[([^\]]+)\]\([^)]*\)$/)
      if (linkMatch)
        return <strong key={i} className="font-semibold text-zinc-100">{linkMatch[1]}</strong>
      return p
    })
    if (appendCursor) parts.push(CURSOR)
    return parts
  }

  function flushList() {
    if (!listItems.length) return
    elements.push(
      <ul key={`ul-${elements.length}`} className="flex flex-col gap-1.5">
        {listItems}
      </ul>
    )
    listItems = []
  }

  const lines = text.split('\n')
  lines.forEach((line, i) => {
    const isLast = i === lines.length - 1
    if (!line.trim()) { flushList(); return }
    if (line.startsWith('• ') || line.startsWith('- ')) {
      listItems.push(
        <li key={i} className="flex items-start gap-2 text-zinc-300">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
          <span>{inline(line.slice(2), streaming && isLast)}</span>
        </li>
      )
    } else {
      flushList()
      elements.push(<p key={i} className="text-zinc-200">{inline(line, streaming && isLast)}</p>)
    }
  })

  flushList()
  return elements
}

interface AgentModalProps {
  open: boolean
  title: string
  icon: React.ReactNode
  /** Tailwind text color for the body spinner, e.g. "text-blue-400" */
  spinnerClass: string
  /** Shown next to the spinner while no text has arrived yet */
  loadingLabel: string
  /** Footer button label while the request is in flight */
  busyLabel: string
  /** Display prose — already sentinel-stripped and typewriter-sliced */
  text: string
  /** Typewriter still running (cursor shown, dismissal locked) */
  isStreaming: boolean
  /** Request in flight — backdrop/Escape dismissal disabled */
  busy: boolean
  onClose: () => void
  /** Extra footer button(s), rendered left of the close button */
  footerExtra?: React.ReactNode
  /** Content below the prose — task cards, chips */
  children?: React.ReactNode
}

export default function AgentModal(props: AgentModalProps) {
  if (!props.open) return null
  return <AgentModalContent {...props} />
}

function AgentModalContent({
  title, icon, spinnerClass, loadingLabel, busyLabel,
  text, isStreaming, busy, onClose, footerExtra, children,
}: AgentModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canDismiss = !busy
  // Refs keep the mount-only focus effect in sync with changing props
  const canDismissRef = useRef(canDismiss)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    canDismissRef.current = canDismiss
    onCloseRef.current = onClose
  })

  // Focus trap + restore — buttons enable as the stream finishes, so the
  // focusable list is queried per keydown rather than once on mount
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const modal = containerRef.current
    if (!modal) return

    const getFocusable = () =>
      Array.from(modal.querySelectorAll<HTMLElement>('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter((el) => !el.hasAttribute('disabled'))

    ;(getFocusable()[0] ?? modal).focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && canDismissRef.current) {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const focusable = getFocusable()
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previouslyFocused?.focus()
    }
  }, [])

  const isError = text.startsWith('Error:')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={() => { if (canDismiss) onClose() }}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-3">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-semibold text-zinc-200">{title}</span>
          </div>
          {canDismiss && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded p-1 text-zinc-500 transition-colors hover:text-zinc-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3 px-5 py-4 text-sm leading-relaxed">
            {!text ? (
              <div role="status" aria-live="polite" className="flex items-center gap-2 text-zinc-500">
                <svg className={`h-4 w-4 animate-spin ${spinnerClass}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {loadingLabel}
              </div>
            ) : isError ? (
              <p role="alert" className="text-red-400">{text}</p>
            ) : (
              renderMarkdown(text, isStreaming)
            )}
          </div>
          {children}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-800 px-5 py-3">
          {!isStreaming && footerExtra}
          <button
            onClick={onClose}
            disabled={isStreaming && !isError}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? busyLabel : isStreaming && !isError ? '…' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  )
}
