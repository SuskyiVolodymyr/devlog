import { runAgentLoop } from '@/lib/agents/loop'
import { getTasks } from '@/lib/db'
import { CLAUDE_MODEL_CAPABLE } from '@/lib/constants'

const SYSTEM_PROMPT = `You are a task prioritization assistant. Analyze the provided task list and recommend where to start the day. Consider: (1) explicit priority level, (2) age of task — older high-priority tasks are more urgent than new ones, (3) in-progress tasks that should be finished before starting new ones, (4) tasks that may be blocking others. Reason through the list and explain your recommendation in 4-6 sentences. End with a numbered list of top 3-5 tasks to focus on today.`

export async function runPrioritizationAgent(): Promise<string> {
  const tasks = getTasks()

  return runAgentLoop(
    SYSTEM_PROMPT,
    [{ role: 'user', content: `Here are all my tasks:\n${JSON.stringify(tasks, null, 2)}\n\nWhere should I focus today?` }],
    [],
    async () => { throw new Error('no tools configured') },
    { model: CLAUDE_MODEL_CAPABLE, maxTokens: 1024 }
  )
}
