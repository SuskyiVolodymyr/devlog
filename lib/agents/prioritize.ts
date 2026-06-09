import { runAgentLoop } from '@/lib/agents/loop'
import { getTasks } from '@/lib/db'
import { CLAUDE_MODEL_CAPABLE } from '@/lib/constants'

const SYSTEM_PROMPT = `You are a task prioritization assistant for an engineering team.

Analyze the tasks and recommend the single most important one to work on right now.

Write flowing prose — no markdown, no headers, no bullet points. Start by naming the task and stating it as the clear choice. Then explain why it should be done first (in-progress tasks, blocking dependencies, urgency). Close with what completing it enables and what happens if it stays unfinished. Under 120 words.`

export async function runPrioritizationAgent(onToken?: (delta: string) => void): Promise<string> {
  const tasks = getTasks()

  return runAgentLoop(
    SYSTEM_PROMPT,
    [{ role: 'user', content: `Here are all my tasks:\n${JSON.stringify(tasks, null, 2)}\n\nWhich single task should I start right now?` }],
    [],
    async () => { throw new Error('no tools configured') },
    { model: CLAUDE_MODEL_CAPABLE, maxTokens: 300, onToken }
  )
}
