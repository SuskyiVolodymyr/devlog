import { runPrioritizationAgent } from '@/lib/agents/prioritize'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'
import { createAgentSSEResponse } from '@/lib/sse'

export async function POST() {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') ?? 'unknown'
    if (!checkRateLimit(ip)) {
      return Response.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 })
    }

    return createAgentSSEResponse((onToken) =>
      runPrioritizationAgent(onToken).then(() => undefined)
    )
  } catch (error) {
    console.error('[/api/ai/prioritize]', error)
    return Response.json({ error: 'AI agent failed. Please try again.' }, { status: 500 })
  }
}
