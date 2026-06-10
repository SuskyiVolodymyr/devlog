import { z } from 'zod'
import { runAgentLoop } from '@/lib/agents/loop'
import { CLAUDE_MODEL_FAST } from '@/lib/constants'

const SYSTEM_PROMPT = `You polish task titles and descriptions for an engineering task tracker. The author may not be a native English speaker — rewrite their draft into clear, professional English.

Rules:
- Title: imperative and specific, ≤80 characters (e.g. "Fix login redirect after OAuth callback").
- Description: 1-3 short sentences. Fix grammar and wording, keep every fact the author gave.
- Never invent requirements, technologies, or details that are not stated or clearly implied.
- If the description is empty, write one sentence restating the title's intent — nothing more.

Respond with only a JSON object: {"title":"...","description":"..."} — no markdown fences, no commentary.`

const improvedTaskSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim(),
})

export type ImprovedTask = z.infer<typeof improvedTaskSchema>

export async function runImproveTaskAgent(title: string, description: string): Promise<ImprovedTask> {
  const raw = await runAgentLoop(
    SYSTEM_PROMPT,
    [{ role: 'user', content: JSON.stringify({ title, description }) }],
    [],
    async () => { throw new Error('no tools configured') },
    { model: CLAUDE_MODEL_FAST, maxTokens: 512 }
  )

  // Strip markdown fences in case the model wraps its output anyway
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  try {
    return improvedTaskSchema.parse(JSON.parse(cleaned))
  } catch {
    throw new Error('Agent returned malformed improvement')
  }
}
