import { runAgentLoop } from '@/lib/agents/loop'
import { createTasksBatchTool, executeDbTool } from '@/lib/agents/tools'
import { getTask } from '@/lib/db'
import { CLAUDE_MODEL_CAPABLE } from '@/lib/constants'

const SYSTEM_PROMPT = `You are a task decomposition assistant. You are given the full task data upfront.

If the description is vague (under 20 words or missing technical specifics): ask ONE clarifying question. No other output.

Otherwise: call create_tasks_batch once with 3–6 concrete subtasks — do not announce the call, do not narrate what you are doing. After the tool succeeds, confirm in one sentence only, e.g. "Created 5 subtasks." No list, no elaboration.

Each subtask must be specific enough to complete in a few hours.`

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
