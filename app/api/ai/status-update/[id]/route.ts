import { runStatusUpdateAgent } from '@/lib/agents/status-update'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const notes = typeof body.notes === 'string' ? body.notes : undefined

    const result = await runStatusUpdateAgent(id, notes)
    return Response.json({ result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
