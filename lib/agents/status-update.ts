import { runAgentLoop } from '@/lib/agents/loop'
import { getTask, getSubtasks } from '@/lib/db'
import { CLAUDE_MODEL_FAST } from '@/lib/constants'

const SYSTEM_PROMPT = `You are a status update writer for an engineering team. Write a short Slack-style async update (3-5 sentences, flowing prose, no bullet points) based on the provided task and subtask data. Tone: casual but professional, like a real teammate. Mention what's done, what's in progress, what's next or blocked. Start naturally with the task context — not "Update for task X:".`

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
