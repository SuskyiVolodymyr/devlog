import { runPrioritizationAgent } from '@/lib/agents/prioritize'

export async function POST() {
  try {
    const result = await runPrioritizationAgent()
    return Response.json({ result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
