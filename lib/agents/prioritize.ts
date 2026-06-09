import { runAgentLoop } from '@/lib/agents/loop'
import { getTasksTool, executeDbTool } from '@/lib/agents/tools'

const SYSTEM_PROMPT = `You are a task prioritization assistant for an engineering team. Analyze the full task list and recommend where to start the day. Consider: (1) explicit priority level, (2) age of task (older high-priority tasks are more urgent than new ones), (3) in-progress tasks that should be finished before starting new ones, (4) todo tasks that are blocking others. Do NOT just sort by priority field. Reason through the list and explain your recommendation in 4-6 sentences. End with a numbered list of top 3-5 tasks to focus on today.`

export async function runPrioritizationAgent(): Promise<string> {
  return runAgentLoop(
    SYSTEM_PROMPT,
    [{ role: 'user', content: 'Please analyze my current task list and tell me where I should focus today.' }],
    [getTasksTool],
    executeDbTool
  )
}
