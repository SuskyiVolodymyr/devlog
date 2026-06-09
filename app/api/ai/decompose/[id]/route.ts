import { runDecompositionAgent } from '@/lib/agents/decompose'
import { getTask } from '@/lib/db'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') ?? 'unknown'
    if (!checkRateLimit(ip)) {
      return Response.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 })
    }

    const task = getTask(id)
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const clarification = typeof body.clarification === 'string' ? body.clarification : undefined

    const result = await runDecompositionAgent(id, clarification)
    const needsClarification = result.trimEnd().endsWith('?')
    return Response.json({ result, needsClarification })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
