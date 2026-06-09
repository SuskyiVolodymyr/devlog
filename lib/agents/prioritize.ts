import { runAgentLoop } from '@/lib/agents/loop'
import { getTasks } from '@/lib/db'
import { CLAUDE_MODEL_CAPABLE } from '@/lib/constants'

const SYSTEM_PROMPT = `You are a task prioritization assistant. Be concise — your entire response must stay under 120 words. Write 2-3 sentences of reasoning covering: in-progress tasks to finish first, high-priority items, and any blocking relationships. Then output a numbered list of the top 3-5 tasks to focus on today using only their titles — never include IDs. No markdown headers.`

export async function runPrioritizationAgent(onToken?: (delta: string) => void): Promise<string> {
  const tasks = getTasks()

  return runAgentLoop(
    SYSTEM_PROMPT,
    [{ role: 'user', content: `Here are all my tasks:\n${JSON.stringify(tasks, null, 2)}\n\nWhere should I focus today?` }],
    [],
    async () => { throw new Error('no tools configured') },
    { model: CLAUDE_MODEL_CAPABLE, maxTokens: 300, onToken }
  )
}
