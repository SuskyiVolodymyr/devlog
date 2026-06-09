import { runAgentLoop } from '@/lib/agents/loop'
import { getTasks } from '@/lib/db'
import { CLAUDE_MODEL_CAPABLE } from '@/lib/constants'

const SYSTEM_PROMPT = `You are a task prioritization assistant.

Respond in exactly this format — no deviations, no extra text:

**[task title]**

• [reason 1 — one line, under 15 words]
• [reason 2 — one line, under 15 words]

[one closing sentence: what completing this unlocks or what stays broken without it]

---
{"id":"[exact task id]","title":"[exact task title]"}`

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
