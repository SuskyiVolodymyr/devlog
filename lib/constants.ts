import type { TaskStatus, TaskPriority } from '@/lib/types'

export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in-progress', 'done']
export const TASK_PRIORITIES: readonly TaskPriority[] = ['low', 'medium', 'high']

// Default fallback — override via env to use a different model globally
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6'
// For agents that need strong reasoning (decompose, prioritize)
export const CLAUDE_MODEL_CAPABLE = process.env.CLAUDE_MODEL_CAPABLE ?? 'claude-sonnet-4-6'
// For simple generation tasks (status update)
export const CLAUDE_MODEL_FAST = process.env.CLAUDE_MODEL_FAST ?? 'claude-haiku-4-5'

export const DB_PATH = process.env.DB_PATH ?? './devlog.db'

interface AIActionDef {
  key: string
  label: string
  description: string
  /** true = only shown when viewing a specific task */
  taskOnly: boolean
  /** true = only shown on the board (no task selected) */
  boardOnly: boolean
  /** Route segment after /api/ai/. Task-scoped actions append /:taskId automatically. */
  route: string
}

export const AI_ACTIONS = [
  { key: 'prioritize',    label: 'Prioritize',      description: 'Recommend where to start based on all tasks',  taskOnly: false, boardOnly: true,  route: 'prioritize'    },
  { key: 'backlog-review', label: 'Backlog Review', description: 'Flag vague, stuck, or under-decomposed tasks', taskOnly: false, boardOnly: true,  route: 'backlog-review' },
  { key: 'decompose',    label: 'Decompose',       description: 'Break this task into subtasks',                  taskOnly: true,  boardOnly: false, route: 'decompose'     },
  { key: 'status-update', label: 'Status Update',  description: 'Draft a Slack-style update for this task',      taskOnly: true,  boardOnly: false, route: 'status-update' },
] as const satisfies readonly AIActionDef[]

// Derived from the registry — the type can't drift from the array
export type AIAction = (typeof AI_ACTIONS)[number]
export type AIActionKey = AIAction['key']

export function buildAgentUrl(action: AIActionKey, taskId?: string): string {
  const def = AI_ACTIONS.find((a) => a.key === action)
  if (!def) throw new Error(`Unknown AI action: ${action}`)
  return def.taskOnly ? `/api/ai/${def.route}/${taskId}` : `/api/ai/${def.route}`
}
