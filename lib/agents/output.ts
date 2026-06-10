import { z } from 'zod'

// Agents that feed UI components end their prose with a sentinel followed by
// JSON carrying exact task IDs — navigation never parses prose.
export const PRIORITIZE_SENTINEL = '\n---'
export const FLAGGED_SENTINEL = '[FLAGGED_JSON]'

export type TaskRef = { id: string; title: string }

const taskRefSchema = z.object({ id: z.string(), title: z.string() })

/** Prose shown to the user — everything before the sentinel. */
export function proseBefore(text: string, sentinel: string): string {
  const idx = text.indexOf(sentinel)
  return idx >= 0 ? text.slice(0, idx).trimEnd() : text
}

/** Prioritize output: prose, `\n---\n`, then a single {id,title} object. */
export function parsePrioritizeRef(text: string): TaskRef | null {
  const parts = text.split('\n---\n')
  if (parts.length < 2) return null
  try {
    return taskRefSchema.parse(JSON.parse(parts[1].trim()))
  } catch {
    return null
  }
}

/** Backlog review output: prose, [FLAGGED_JSON], then an array of {id,title}. */
export function parseFlaggedRefs(text: string): TaskRef[] {
  const idx = text.indexOf(FLAGGED_SENTINEL)
  if (idx < 0) return []
  try {
    return z.array(taskRefSchema).parse(JSON.parse(text.slice(idx + FLAGGED_SENTINEL.length).trim()))
  } catch {
    return []
  }
}
