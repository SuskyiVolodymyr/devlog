import { createTask } from '@/lib/db'

// Intentionally varied quality — some tasks are clean, some are vague or stuck
// so every AI agent has something interesting to work with.
export async function POST() {
  try {
    // --- Clear, well-defined tasks ---
    const ci = createTask({
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions to run tests on every PR and deploy to staging on merge to develop. Include lint, type-check, and test steps. Add a Slack notification on failure.',
      status: 'todo',
      priority: 'high',
    })

    const docs = createTask({
      title: 'Write API documentation',
      description: 'Document all REST endpoints in README or a dedicated docs/api.md. Include request/response shapes, status codes, and example curl commands for each route.',
      status: 'in-progress',
      priority: 'medium',
      notes: 'Started with /api/tasks — GET and POST done. Still need PUT, DELETE, and all AI routes.',
    })
    // Subtasks for the docs task — this shows Status Update agent best
    createTask({ title: 'Document /api/tasks GET and POST', description: 'Request params, response shape, error cases.', status: 'done', parentId: docs.id })
    createTask({ title: 'Document /api/tasks/[id] PUT and DELETE', description: 'Include cascade delete behaviour for subtasks.', status: 'todo', parentId: docs.id })
    createTask({ title: 'Document /api/ai/* endpoints', description: 'Cover all three agent routes, request body, SSE response format.', status: 'todo', parentId: docs.id })

    const perf = createTask({
      title: 'Investigate slow task list queries',
      description: 'The GET /api/tasks endpoint takes 800ms+ on a 500-task board. Profile the SQLite query, check index usage with EXPLAIN QUERY PLAN, and add indexes if missing.',
      status: 'todo',
      priority: 'high',
    })

    // --- Done task (shows completed work for Prioritize to deprioritise) ---
    createTask({
      title: 'Add dark mode support',
      description: 'Switch global styles to zinc/slate palette. Confirmed all components use Tailwind utility classes — no hardcoded colours.',
      status: 'done',
      priority: 'low',
    })

    // --- Intentionally problematic tasks (Backlog Review will flag these) ---

    // Vague — triggers clarity flag
    createTask({
      title: 'Fix auth',
      description: 'broken',
      status: 'todo',
      priority: 'high',
    })

    // In-progress, no subtasks, no notes — triggers stuck flag
    createTask({
      title: 'Refactor database layer',
      description: 'Move all raw SQL out of route handlers into lib/db.ts.',
      status: 'in-progress',
      priority: 'high',
    })

    // High priority, no decomposition — triggers decomposition flag
    createTask({
      title: 'Implement real-time notifications',
      description: 'Users should receive browser notifications when a task is assigned to them or when a subtask is completed.',
      status: 'todo',
      priority: 'high',
    })

    // Old-ish stale todo — low priority, never touched
    createTask({
      title: 'Update dependencies',
      description: 'Run npm audit and update packages with known vulnerabilities. Check for major version bumps that need migration.',
      status: 'todo',
      priority: 'low',
    })

    return Response.json({ ok: true })
  } catch (error) {
    console.error('[/api/dev/seed]', error)
    return Response.json({ error: 'Failed to seed demo data' }, { status: 500 })
  }
}
