import { runAgentLoop } from '@/lib/agents/loop'
import { getTask, getSubtasks } from '@/lib/db'
import { CLAUDE_MODEL_FAST } from '@/lib/constants'

const SYSTEM_PROMPT = `You are a status update writer for an engineering team. Draft a short Slack-style async update from the provided task and subtask data.

Output exactly this structure — nothing else:
1. One opening sentence of context (≤20 words), starting naturally — not "Update for task X:".
2. One bullet per line, only the labels that apply:
• **Done** — [what's finished, ≤12 words]
• **In progress** — [what's being worked on, ≤12 words]
• **Next** — [what's coming up, ≤12 words]
• **Blocked** — [the blocker, ≤12 words] (only if something is actually blocked)
Each label appears at most once — summarize across subtasks, never one bullet per subtask.
3. Optional closing sentence (≤15 words) only if timing or risk is worth mentioning.

Tone: casual but professional, like a real teammate posting in a channel. No task IDs, no headers.`

export async function runStatusUpdateAgent(
  taskId: string,
  notes?: string,
  onToken?: (delta: string) => void
): Promise<string> {
  const task = getTask(taskId)
  if (!task) throw new Error(`Task ${taskId} not found`)
  const subtasks = getSubtasks(taskId)

  let userMessage = `Task and subtask data:\n${JSON.stringify({ task, subtasks }, null, 2)}`
  if (notes) userMessage += `\n\nExecution notes: ${notes}`

  return runAgentLoop(
    SYSTEM_PROMPT,
    [{ role: 'user', content: userMessage }],
    [],
    async () => { throw new Error('no tools configured') },
    { model: CLAUDE_MODEL_FAST, maxTokens: 512, onToken }
  )
}
