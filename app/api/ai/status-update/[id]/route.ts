import { runStatusUpdateAgent } from '@/lib/agents/status-update'
import { getTask } from '@/lib/db'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'
import { createAgentSSEResponse } from '@/lib/sse'
import { notesSchema } from '@/lib/schemas'

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
    let notes: string | undefined
    if (typeof body.notes === 'string') {
      const parsed = notesSchema.safeParse(body.notes)
      if (!parsed.success) {
        return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
      }
      notes = parsed.data
    }

    return createAgentSSEResponse((onToken) =>
      runStatusUpdateAgent(id, notes, onToken).then(() => undefined)
    )
  } catch (error) {
    console.error('[/api/ai/status-update]', error)
    return Response.json({ error: 'AI agent failed. Please try again.' }, { status: 500 })
  }
}
