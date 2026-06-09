import { runAgentLoop } from '@/lib/agents/loop'
import { createTasksBatchTool, executeDbTool } from '@/lib/agents/tools'
import { getTask } from '@/lib/db'
import { CLAUDE_MODEL_CAPABLE } from '@/lib/constants'

const SYSTEM_PROMPT = `You are a task decomposition assistant. You are given the full task data upfront. If the description is vague (under 20 words or missing technical specifics), ask ONE clarifying question instead of creating subtasks. Otherwise, create 3-6 concrete subtasks using create_tasks_batch in a single call — do not call it multiple times. Each subtask should be specific enough to complete in a few hours.`

export async function runDecompositionAgent(
  taskId: string,
  clarification?: string,
  onToken?: (delta: string) => void
): Promise<string> {
  const task = getTask(taskId)
  if (!task) throw new Error(`Task ${taskId} not found`)

  let userMessage = `Task to decompose:\n${JSON.stringify(task, null, 2)}`
  if (clarification) userMessage += `\n\nUser clarification: ${clarification}`

  return runAgentLoop(
    SYSTEM_PROMPT,
    [{ role: 'user', content: userMessage }],
    [createTasksBatchTool],
    executeDbTool,
    { model: CLAUDE_MODEL_CAPABLE, maxTokens: 2048, onToken }
  )
}
