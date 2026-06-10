import { runImproveTaskAgent } from '@/lib/agents/improve-task'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'
import { improveTaskInputSchema } from '@/lib/schemas'

export async function POST(request: Request) {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') ?? 'unknown'
    if (!checkRateLimit(ip)) {
      return Response.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = improveTaskInputSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const improved = await runImproveTaskAgent(parsed.data.title, parsed.data.description)
    return Response.json(improved)
  } catch (error) {
    console.error('[/api/ai/improve-task]', error)
    return Response.json({ error: 'AI agent failed. Please try again.' }, { status: 500 })
  }
}
