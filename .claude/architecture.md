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
| POST | `/api/ai/prioritize` | Run prioritization agent |
| POST | `/api/ai/decompose/[id]` | Run decomposition agent |
| POST | `/api/ai/status-update/[id]` | Run status update agent |

## AI agent architecture

All agents share a common loop in `lib/agents/loop.ts`:

```
User request
  → build system prompt + initial messages
  → call Claude with tool definitions
  → if Claude calls a tool: execute it, append result, loop
  → if Claude returns text (no tool call): done, return text
```

Agents expose DB tools (get_tasks, get_task, create_task, update_task) typed as `Anthropic.Tool[]`. The loop runner is generic — each agent only defines its system prompt and its tool set.

Responses stream via Server-Sent Events so the UI shows Claude reasoning in real time.

## State management

No global state library — React `useState` + `useEffect` + fetch. Simple enough for this scope.
