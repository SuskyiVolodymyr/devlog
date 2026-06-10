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

The only required variable. All AI features are live once the key is set. Optional overrides (see `.env.example`): `CLAUDE_MODEL_CAPABLE` (reasoning agents, default `claude-sonnet-4-6`), `CLAUDE_MODEL_FAST` (simple generation, default `claude-haiku-4-5`), `DB_PATH`.

## What it does

### Task tracker
- Create, edit, delete tasks with title, description, status (`todo` / `in-progress` / `done`), and priority (`low` / `medium` / `high`)
- Filter by status, sort by priority or date
- Subtasks — tasks can have child tasks; clicking a card opens the detail view
- Notes — free-form textarea on each task, auto-saves on blur

### AI features

Five features. The four agents on the board/task pages use Claude's tool-use API — genuinely multi-step, not single prompts.

| Feature | Where | What it does |
|---------|-------|--------------|
| **Prioritize** | Main page AI panel | Fetches all tasks, reasons about priority + age + in-progress state, recommends where to start the day — opens a modal with a streamed explanation and a "Start here" card that navigates to the task |
| **Backlog Review** | Main page AI panel | Scans all open tasks for quality issues: vague descriptions, high-priority items with no decomposition, stuck in-progress tasks, forgotten to-dos. Streams a flagged-task report into a modal with clickable chips for each task that needs attention. |
| **Decompose** | Task detail AI panel | Reads the task; if the description is vague asks a clarifying question first (with a reply box in the UI). Otherwise creates 3–6 subtasks in the DB and refreshes the list automatically. |
| **Status Update** | Task detail AI panel | Reads the task and its subtasks, drafts a structured Slack-style update (context line + Done / In progress / Next / Blocked bullets) with a "Copy for Slack" button that converts to Slack markdown |
| **Improve with AI** | New/Edit Task form | Rewrites a rough title and description into clear, professional English — built for non-native speakers. Never invents details, one-click Undo restores the original. |

Each agent calls tools (DB reads, task creation), receives results, reasons further, and decides whether to call more tools or return — the classic agentic loop.

**Streaming UX**: agent responses stream over SSE. The modal opens instantly, tokens render with a smooth typewriter animation (rAF-driven, decoupled from network bursts), and structured data (task references for navigation) is separated from prose via a sentinel so the UI can render chips/cards once the stream completes.

**Why Backlog Review matters for engineering teams**: Engineers routinely lose sprint planning time to poorly defined tasks — tickets with one-line descriptions, high-priority items nobody decomposed, in-progress tasks that have silently stalled. Catching these before the planning meeting is the job of a senior engineer doing "backlog grooming," a 30–60 minute manual process that happens every 1–2 weeks. The Backlog Review agent does this in seconds: it reads every open task, selectively fetches subtask state for complex items, applies consistent quality criteria, and surfaces only the tasks that genuinely need attention. The result is actionable rather than advisory — each flagged task comes with a specific fix, not just a flag.

**Why Improve with AI matters**: many engineering teams work in English while few members are native speakers. Tickets written in rushed, broken English become exactly the vague tasks Backlog Review later flags. Fixing the problem at the point of entry — one click while creating the task — is cheaper than grooming it later. The agent is deliberately constrained: it cleans wording and structure but is forbidden from inventing requirements the author didn't write.

### Trying the AI features

Click **Demo data** in the top-right header to load 9 pre-built tasks — intentionally varied so every agent has something to work with:

- **Prioritize / Backlog Review** — run from the main page. Backlog Review should flag 3–4 tasks: "Fix auth" (vague), "Refactor database layer" (stuck in-progress), "Implement real-time notifications" (no decomposition)
- **Decompose** — "Set up CI/CD pipeline" has a clear description → subtasks created directly; "Fix auth" (description: "broken") → clarifying question first
- **Status Update** — "Write API documentation" has 3 subtasks and execution notes
- **Improve with AI** — "+ New Task", type a rough draft like *"fix bug when user click save two times and it create duplicate task"*

Clicking "Demo data" again adds another batch on top. To start clean, delete all tasks and click it once more.

## Architecture

```
app/
  page.tsx                  Task list — filters, grid, desktop AI sidebar
  tasks/[id]/page.tsx       Task detail — notes, subtasks, AI panel
  api/tasks/                CRUD REST endpoints (paginated list, Zod-validated)
  api/ai/                   AI agent endpoints (SSE streaming)
components/
  TaskCard, TaskForm        Task UI (TaskForm hosts "Improve with AI")
  FilterBar, AIPanel        Supporting UI (AIPanel hosts the agent modals)
  StatusBadge, PriorityBadge
lib/
  db.ts                     All SQLite access (single source of truth)
  types.ts                  Shared TypeScript types
  schemas.ts                Zod schemas for API boundary validation
  api-client.ts             Typed fetch wrappers + shared error parsing
  constants.ts              Models, AI action registry, status/priority enums
  sse.ts                    SSE response helper for agent routes
  rateLimit.ts              In-memory per-IP rate limiting for AI endpoints
  styling.ts                Shared status/priority style maps
  hooks/useTasks.ts         TanStack Query hooks (list, mutations, optimistic updates)
  agents/
    loop.ts                 Generic tool-use agent loop (shared by all agents)
    tools.ts                DB tool definitions for Claude
    prioritize.ts           Prioritization agent
    backlog-review.ts       Backlog review agent (own-idea feature)
    decompose.ts            Decomposition agent
    status-update.ts        Status update agent
    improve-task.ts         Title/description rewriting agent (own-idea feature)
```

### Storage — SQLite via `better-sqlite3`

**Why SQLite**: zero infrastructure, file-based, survives restarts, solid SQL for filtering and sorting. Right for a single-user local tool.

**Limitation**: single writer — not suitable for concurrent multi-user production. To scale, replace `lib/db.ts` with Postgres/Prisma; the API surface stays the same.

The database file (`devlog.db`) is created on first run and gitignored.

### Agent architecture — shared tool-use loop

All agents go through one generic loop in `lib/agents/loop.ts`:

```
User triggers action
  → Claude receives system prompt + tool definitions
  → Claude calls a tool → we execute it against SQLite → result fed back
  → Claude reasons, calls more tools or returns final text
  → Text streamed token-by-token to the UI over SSE
```

Each agent only defines its system prompt and which tools it can use. The loop is model-agnostic: reasoning agents run on Sonnet, simple generation on Haiku (both env-overridable). Agents that feed UI components (Prioritize, Backlog Review) end their output with a sentinel-separated JSON block carrying exact task IDs, so navigation never depends on parsing prose.

### API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List tasks — query: `?status=`, `?sort=priority\|date`, `?parentId=` |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/[id]` | Get task |
| PUT | `/api/tasks/[id]` | Update task |
| DELETE | `/api/tasks/[id]` | Delete task (cascades to subtasks) |
| POST | `/api/ai/prioritize` | Run prioritization agent |
| POST | `/api/ai/backlog-review` | Run backlog review agent |
| POST | `/api/ai/decompose/[id]` | Run decomposition agent — body: `{ clarification? }` |
| POST | `/api/ai/status-update/[id]` | Run status update agent — body: `{ notes? }` |
| POST | `/api/ai/improve-task` | Rewrite a draft — body: `{ title, description }`, returns improved JSON |

Task list responses embed subtask progress counts via correlated subqueries — the board renders from a single request. AI endpoints are rate-limited per IP and stream over SSE (except `improve-task`, which returns JSON because it fills form fields).

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16.2, App Router, TypeScript, Turbopack |
| Styling | Tailwind CSS |
| Storage | SQLite via `better-sqlite3` |
| AI | Anthropic Claude API (`claude-sonnet-4-6` / `claude-haiku-4-5`) |
| Server state | TanStack Query v5 — caching, infinite pagination, optimistic status updates |
| Validation | Zod at API boundaries |

## Deliberate trade-offs

- **No auth** — single-user scope, as specified
- **SQLite only** — single-writer limitation documented above; Postgres swap stays behind `lib/db.ts`
- **In-memory rate limiting** — per-process, resets on restart; fine for local single-user, would need Redis behind a load balancer
- **No automated tests** — within the 8–10h scope cap, verification was strict TypeScript + ESLint + live browser testing of every feature (each AI flow was exercised end-to-end before commit). With more time, the first tests would target `lib/db.ts` and the agent output parsers, where regressions are most likely.
- **Decompose clarification detection is heuristic** — the agent signals a question via response shape; a structured tool-based handshake would be more robust but adds a round-trip
- **Modal markdown renderer is hand-rolled** (~50 lines for bold + bullets + links) — a library would handle more syntax, but the agents' output format is pinned by their prompts, so the extra surface is unnecessary
