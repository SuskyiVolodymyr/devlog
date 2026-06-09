# DevLog

AI-powered task tracker for engineering teams. Built with Next.js 16, SQLite, and Claude API agents.

## Quick start

```bash
git clone https://github.com/SuskyiVolodymyr/devlog.git
cd devlog
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

```bash
ANTHROPIC_API_KEY=   # required — get from https://console.anthropic.com
```

The only external dependency. All AI features are live once the key is set.

## What it does

### Task tracker
- Create, edit, delete tasks with title, description, status (`todo` / `in-progress` / `done`), and priority (`low` / `medium` / `high`)
- Filter by status, sort by priority or date
- Subtasks — tasks can have child tasks; clicking a card opens the detail view
- Notes — free-form textarea on each task, auto-saves on blur

### AI agents

Three agents, all using Claude's tool-use API — genuinely multi-step, not single prompts.

| Agent | Where | What it does |
|-------|-------|______________|
| **Prioritize** | Main page AI panel | Fetches all tasks, reasons about priority + age + in-progress state, recommends where to start the day with a written explanation |
| **Decompose** | Task detail AI panel | Reads the task; if the description is vague asks a clarifying question first. Otherwise creates 3–6 subtasks in the DB and refreshes the list automatically. |
| **Status Update** | Task detail AI panel | Reads the task and its subtasks, drafts a Slack-style async update in flowing prose |

Each agent calls tools (DB reads, task creation), receives results, reasons further, and decides whether to call more tools or return — the classic agentic loop.

## Architecture

```
app/
  page.tsx                  Task list — filters, grid, desktop AI sidebar
  tasks/[id]/page.tsx       Task detail — notes, subtasks, AI panel
  api/tasks/                CRUD REST endpoints
  api/ai/                   AI agent endpoints
components/
  TaskCard, TaskForm        Task UI
  FilterBar, AIPanel        Supporting UI
  StatusBadge, PriorityBadge
lib/
  db.ts                     All SQLite access (single source of truth)
  types.ts                  Shared TypeScript types
  agents/
    loop.ts                 Generic tool-use agent loop (shared by all agents)
    tools.ts                DB tool definitions for Claude
    prioritize.ts           Prioritization agent
    decompose.ts            Decomposition agent
    status-update.ts        Status update agent
```

### Storage — SQLite via `better-sqlite3`

**Why SQLite**: zero infrastructure, file-based, survives restarts, solid SQL for filtering and sorting. Right for a single-user local tool.

**Limitation**: single writer — not suitable for concurrent multi-user production. To scale, replace `lib/db.ts` with Postgres/Prisma; the API surface stays the same.

The database file (`devlog.db`) is created on first run and gitignored.

### Agent architecture — shared tool-use loop

All three agents go through one generic loop in `lib/agents/loop.ts`:

```
User triggers action
  → Claude receives system prompt + tool definitions
  → Claude calls a tool → we execute it against SQLite → result fed back
  → Claude reasons, calls more tools or returns final text
  → Text returned to the UI
```

Each agent only defines its system prompt and which tools it can use. The loop is model-agnostic and reused across all three agents.

### API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List tasks — query: `?status=`, `?sort=priority\|date`, `?parentId=` |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/[id]` | Get task |
| PUT | `/api/tasks/[id]` | Update task |
| DELETE | `/api/tasks/[id]` | Delete task (cascades to subtasks) |
| POST | `/api/ai/prioritize` | Run prioritization agent |
| POST | `/api/ai/decompose/[id]` | Run decomposition agent — body: `{ clarification? }` |
| POST | `/api/ai/status-update/[id]` | Run status update agent — body: `{ notes? }` |

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16.2, App Router, TypeScript, Turbopack |
| Styling | Tailwind CSS |
| Storage | SQLite via `better-sqlite3` |
| AI | Anthropic Claude API (`claude-opus-4-8`) |
| State | React `useState` / `useEffect` — no external library |

## Deliberate trade-offs

- **No auth** — single-user scope, as specified
- **SQLite only** — documented limitation; Postgres drop-in if needed
- **N+1 subtask count requests** on the main page — acceptable at this scale; a batch API or COUNT subquery would eliminate it
- **Agents return complete text** — no streaming; the `AIPanel` handles SSE if the routes ever upgrade
