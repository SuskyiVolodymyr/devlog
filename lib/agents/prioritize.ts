import { runAgentLoop } from '@/lib/agents/loop'
import { getTasks } from '@/lib/db'
import { CLAUDE_MODEL_CAPABLE } from '@/lib/constants'

const SYSTEM_PROMPT = `You are a task prioritization assistant for an engineering team.

Analyze the tasks and pick the single most important task to start right now. Consider:
- In-progress tasks should usually be finished before starting new ones
- High-priority items and blocking dependencies
- Overall impact and urgency

Respond with ONLY valid JSON — no markdown fences, no preamble, no extra text:
{"id":"<exact task id>","pick":"<exact task title>","why":"<one crisp sentence: why this task above all others right now>","context":"<2-3 sentences: what makes it urgent, what it unblocks, what finishing it enables>"}`

export async function runPrioritizationAgent(onToken?: (delta: string) => void): Promise<string> {
  const tasks = getTasks()

  return runAgentLoop(
    SYSTEM_PROMPT,
    [{ role: 'user', content: `Here are all my tasks:\n${JSON.stringify(tasks, null, 2)}\n\nWhich single task should I start right now?` }],
    [],
    async () => { throw new Error('no tools configured') },
    { model: CLAUDE_MODEL_CAPABLE, maxTokens: 512, onToken }
  )
}
