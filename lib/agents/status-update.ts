import { runAgentLoop } from '@/lib/agents/loop'
import { getTaskTool, getSubtasksTool, executeDbTool } from '@/lib/agents/tools'

const SYSTEM_PROMPT = `You are a status update writer for an engineering team. Write a short Slack-style async update (3-5 sentences, flowing prose, no bullet points) based on the task and its subtasks. Tone: casual but professional, like a real teammate. Mention what's done, what's in progress, what's next or blocked. Start naturally with the task context — not "Update for task X:".`

export async function runStatusUpdateAgent(taskId: string, notes?: string): Promise<string> {
  let userMessage = `Write a status update for task ${taskId}.`
  if (notes) {
    userMessage += `\nExecution notes: ${notes}`
  }

  return runAgentLoop(
    SYSTEM_PROMPT,
    [{ role: 'user', content: userMessage }],
    [getTaskTool, getSubtasksTool],
    executeDbTool
  )
}
