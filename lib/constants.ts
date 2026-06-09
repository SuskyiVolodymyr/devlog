import type { TaskStatus, TaskPriority } from '@/lib/types'

export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in-progress', 'done']
export const TASK_PRIORITIES: readonly TaskPriority[] = ['low', 'medium', 'high']

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-4-8'
export const DB_PATH = process.env.DB_PATH ?? './devlog.db'

export type AIActionKey = 'prioritize' | 'decompose' | 'status-update'

export interface AIAction {
  key: AIActionKey
  label: string
  description: string
  taskOnly: boolean
}

export const AI_ACTIONS: readonly AIAction[] = [
  { key: 'prioritize', label: 'Prioritize', description: 'Recommend where to start based on all tasks', taskOnly: false },
  { key: 'decompose', label: 'Decompose', description: 'Break this task into subtasks', taskOnly: true },
  { key: 'status-update', label: 'Status Update', description: 'Draft a Slack-style update for this task', taskOnly: true },
]

export function buildAgentUrl(action: AIActionKey, taskId?: string): string {
  if (action === 'prioritize') return '/api/ai/prioritize'
  if (action === 'decompose') return `/api/ai/decompose/${taskId}`
  return `/api/ai/status-update/${taskId}`
}
