import { runAgentLoop } from '@/lib/agents/loop'
import { getTaskTool, createTaskTool, executeDbTool } from '@/lib/agents/tools'

const SYSTEM_PROMPT = `You are a task decomposition assistant. Given a task, break it into concrete, actionable subtasks. If the task description is vague (under 20 words or missing technical specifics), ask ONE clarifying question instead of generating subtasks — do not guess. If the description is clear, generate 3-6 subtasks and create them in the system using the create_task tool. Each subtask should be specific enough to complete in a few hours.`

export async function runDecompositionAgent(taskId: string, clarification?: string): Promise<string> {
  let userMessage = `Decompose task ${taskId} into subtasks.`
  if (clarification) {
    userMessage += `\nUser clarification: ${clarification}`
  }

  return runAgentLoop(
    SYSTEM_PROMPT,
    [{ role: 'user', content: userMessage }],
    [getTaskTool, createTaskTool],
    executeDbTool
  )
}
