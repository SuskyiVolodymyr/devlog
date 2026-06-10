# Architecture

## Data storage: SQLite

We use `better-sqlite3` (synchronous SQLite). The database file is `devlog.db` in the project root (gitignored).

**Why SQLite**: zero infrastructure, file-based persistence, good SQL for filtering/sorting, perfect for single-user local app. Limitation: single writer only — not suitable for concurrent multi-user production use.

## Schema

```sql
CREATE TABLE tasks (
  id          TEXT PRIMARY KEY,          -- nanoid
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'todo',     -- todo | in-progress | done
  priority    TEXT NOT NULL DEFAULT 'medium',   -- low | medium | high
  parent_id   TEXT REFERENCES tasks(id),        -- null = top-level, set = subtask
  notes       TEXT NOT NULL DEFAULT '',         -- free-form execution notes
  created_at  TEXT NOT NULL                     -- ISO 8601
);
```

`parent_id` makes subtasks first-class tasks — no separate table, same CRUD.

## API shape

All routes under `app/api/`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List tasks. Query: `?status=`, `?sort=priority\|date`, `?parentId=` |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/[id]` | Get single task |
| PUT | `/api/tasks/[id]` | Update task |
| DELETE | `/api/tasks/[id]` | Delete task (cascades to subtasks) |
| POST | `/api/ai/prioritize` | Run prioritization agent (SSE) |
| POST | `/api/ai/backlog-review` | Run backlog review agent (SSE) |
| POST | `/api/ai/decompose/[id]` | Run decomposition agent (SSE) |
| POST | `/api/ai/status-update/[id]` | Run status update agent (SSE) |
| POST | `/api/ai/improve-task` | Rewrite draft title/description (plain JSON) |

`GET /api/tasks` supports `?page=` / `?limit=` (50/page default) and embeds per-task subtask counts via correlated subqueries — the board renders from one request. POST/PUT bodies are validated with Zod (`lib/schemas.ts`). AI routes are rate-limited per IP (`lib/rateLimit.ts`).

## AI agent architecture

All agents share a common loop in `lib/agents/loop.ts`:

```
User request
  → build system prompt + initial messages
  → call Claude with tool definitions
  → if Claude calls a tool: execute it, append result, loop
  → if Claude returns text (no tool call): done, return text
```

Agents expose DB tools (get_tasks, get_task, create_task, update_task) typed as `Anthropic.Tool[]`. The loop runner is generic — each agent only defines its system prompt and its tool set. Models are tiered via `lib/constants.ts`: `CLAUDE_MODEL_CAPABLE` (Sonnet) for reasoning agents, `CLAUDE_MODEL_FAST` (Haiku) for simple generation.

Agent routes stream tokens over SSE (`lib/sse.ts` wraps the loop's `onToken` callback; errors are sanitized before streaming). Client-side, `lib/hooks/useAgentStream.ts` owns the stream lifecycle — SSE parsing, per-frame render batching, typewriter animation (skipped under prefers-reduced-motion), and the decompose clarification handshake. `components/AgentModal.tsx` is the shared modal shell (focus trap, error styling). Agents that feed UI components end their output with a sentinel-separated JSON block (`---` for prioritize, `[FLAGGED_JSON]` for backlog review) carrying exact task IDs — parsers live in `lib/agents/output.ts`, navigation never parses prose. `improve-task` is the exception: no tools, returns validated JSON, no streaming (it fills form fields).

UI registration is data-driven: adding an agent means a new file in `lib/agents/`, a route, and one entry in `AI_ACTIONS` (`lib/constants.ts`).

## State management

TanStack Query v5 (`lib/hooks/useTasks.ts`): `useInfiniteQuery` for the paginated list, mutations invalidate `['tasks']` / `['task', id]` / `['subtasks']`, and status changes apply optimistically with rollback on error. Subtask progress counts come embedded in the task list response — do not fetch them separately.
