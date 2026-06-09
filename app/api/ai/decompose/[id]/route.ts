import { runDecompositionAgent } from '@/lib/agents/decompose'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const clarification = typeof body.clarification === 'string' ? body.clarification : undefined

    const result = await runDecompositionAgent(id, clarification)
    return Response.json({ result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
