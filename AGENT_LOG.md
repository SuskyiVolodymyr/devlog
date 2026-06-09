# AGENT_LOG — AI-Assisted Development Journal

Honest account of how Claude Code was used to build DevLog. What the agent did, where it helped, where it fell short, and what needed manual intervention.

---

## Tool: Claude Code (claude-sonnet-4-6 in Claude Code desktop app)

All development done with Claude Code as the primary coding assistant. The session used:
- **Parallel sub-agents** (`Agent` tool with `isolation: "worktree"`) for simultaneous feature branches
- **GitHub MCP** for all git operations — repo creation, branches, commits, PRs, merges
- **Custom `/review` slash command** (`.claude/commands/review.md`) for project-aware code review
- **Context files** loaded selectively: `CLAUDE.md`, `AGENTS.md`, `.claude/architecture.md`, `.claude/conventions.md`, `.claude/github.md`, `docs/features/ai-agents.md`
- **Memory** (`~/.claude/projects/`) for persistent preferences across sessions

---

## Phase 0: Project planning and Claude Code infrastructure

**What I asked Claude to do**: Design the full project architecture, decide on storage strategy, plan the AI agent approach, then set up all Claude Code context files.

**What Claude did**: Proposed the separation of CLAUDE.md into focused per-domain files (architecture, conventions, github rules) so context loads selectively rather than as one monolithic file. That was Claude's suggestion — I had expected one big file. It also flagged that Next.js 16 auto-generates both `CLAUDE.md` and `AGENTS.md` via `create-next-app`, which is a native signal that the ecosystem is catching up to agent-assisted development.

**What I changed**: Minor wording in `.claude/github.md` to match our exact branching flow.

**Honest assessment**: The infrastructure setup was nearly perfect out of the box. Claude understood the purpose of keeping context lean without being asked explicitly.

---

## Phase 1: Repository and branch setup

**What I asked Claude to do**: Create the GitHub repo, scaffold Next.js 16, set up `main` and `develop` branches, connect everything.

**What Claude did**: Used GitHub MCP to create the repo, ran `create-next-app@16` (which surfaced Next.js 16's native AGENTS.md support), renamed `master` → `main`, pushed, created `develop` via MCP.

**What I changed**: Nothing — Claude handled the full git workflow via MCP with no manual terminal work.

**Honest assessment**: The GitHub MCP workflow was smooth. One minor friction: the initial repo had `autoInit: true` which created an empty commit, causing a merge conflict with the local repo's initial commit. Claude caught this and handled it (pull with `--allow-unrelated-histories`).

---

## Phase 2: Shared setup — deps and types

**What I asked Claude to do**: Install `better-sqlite3`, `@anthropic-ai/sdk`, `nanoid`; define `lib/types.ts` with the shared `Task` type so all parallel agents start from a consistent base.

**What Claude did**: Installed packages, created the types file, committed on a `chore/setup-deps` branch, PR'd and merged.

**Why this came before the parallel agents**: Three agents working simultaneously would each define `Task` independently → type drift. Doing it once upfront meant every agent imported from `@/lib/types`.

---

## Phase 3: Parallel sub-agents

**What I asked Claude to do**: Spawn three simultaneous sub-agents to build the data layer, UI, and AI infrastructure in parallel using `Agent` tool with `isolation: "worktree"`.

**What the agents did**:

### Agent 1 — `feat/data-layer`
Built `lib/db.ts` (SQLite with WAL mode, foreign keys, all CRUD functions) and the API routes. The agent used Next.js 16's async params convention (`await params`) correctly. SQLite query construction with dynamic filters was clean.

### Agent 2 — `feat/task-ui`
Scaffolded all 6 components (`TaskCard`, `TaskForm`, `FilterBar`, `StatusBadge`, `PriorityBadge`, `AIPanel`) plus both pages. The agent made a good product decision independently: status cycling on badge click (no modal needed for the most common action). The dark zinc/slate palette was solid.

### Agent 3 — `feat/ai-agents`
Implemented the shared `runAgentLoop`, tool definitions, and three agents. Used `Promise.all` for concurrent tool calls within a single agent step. Created a minimal `lib/db.ts` stub since the data layer was being built in parallel.

**What needed manual intervention**:

1. **Stub conflict**: Agent 3 created `lib/db.ts` (stub) which conflicted with Agent 1's real implementation when merging to `develop`. Resolved by adding a cleanup commit on `feat/ai-agents` that deleted the stub — the squash-merge net diff then had no change to `lib/db.ts`. This was expected and handled cleanly.

2. **Two TypeScript errors post-merge**: `tools.ts` passed `Record<string, unknown>` to `createTask` (expects `CreateTaskInput`) — solved with a double-cast via `unknown`. `db.ts` had a dead `parentId` column remap (not in `UpdateTaskInput`) — removed. Both were boundary-mismatch gaps from agents working in isolation.

3. **parentId null coercion bug**: `page.tsx` sent `parentId=null` as a URL string. The API compared `filters.parentId === null` which failed on the string `"null"`. The main page never loaded top-level tasks. Fixed by coercing `"null"` → `null` at the API boundary — the kind of bug that only surfaces at integration time.

**What impressed me**: The agents read and followed the context files (`AGENTS.md`, `.claude/conventions.md`) without reminders. Every API route had the correct try/catch shape. Component naming was consistent across all three agents despite working in isolation.

---

## Phase 4: Code review and polish

**What I asked Claude to do**: Run the `/review` slash command (via the `code-review` skill), look at the full architecture, find everything worth fixing.

**What the review found** (7 confirmed issues across two parallel reviewer agents):

| Severity | Issue | Caught by |
|----------|-------|----------|
| Critical | `claude-opus-4-5` is a retired model — every AI call would 404 | Reviewer angle A |
| Security | SQL injection via unsanitized `Object.keys` in `updateTask` | Reviewer angle C |
| Bug | `res.json()` on error path throws on HTML/proxy error bodies | Reviewer angle A |
| Bug | `saveTimeout` not cleared on unmount → setState after unmount | Reviewer angle B |
| UX gap | Decompose clarification flow — agent asks question, user can't reply | Manual review |
| UI bug | `setActiveAction` never reset → button stays highlighted forever | Reviewer angle A |
| Polish | Layout metadata still said "Create Next App" | Manual review |

**What I added beyond the review**: The clarification flow wasn't caught by the automated reviewer (it's a product gap, not a code bug). I noticed it during manual inspection and implemented it in `AIPanel.tsx`: detect when the decompose response ends with `?`, show a clarification textarea, re-call the agent with `{ clarification }`.

**Honest assessment**: The model ID bug (using a retired model) is the most embarrassing catch — it would have made all AI features non-functional on first run for the reviewers. It was introduced by the AI agent and caught by a different AI agent. The SQL injection was a real security issue that the automated review correctly flagged.

---

## Phase 5: Own-idea agent — Backlog Review

**What I asked Claude to do**: Propose and implement a fourth agent beyond the three specified ones.

**The idea**: A Backlog Review agent that scans all open tasks and flags quality issues before sprint planning — vague descriptions, high-priority tasks with no decomposition, in-progress tasks with no subtasks or notes, forgotten to-dos older than two weeks. This is the "backlog grooming" job a senior engineer does manually every sprint.

**What Claude did**: Implemented `lib/agents/backlog-review.ts` using the `get_all_tasks` and `get_subtasks` tools (a real two-step agentic loop — fetch all, then selectively drill into complex tasks). Added the API route at `/api/ai/backlog-review`, registered it in `AI_ACTIONS` so it appears automatically on the main page panel between Prioritize and Decompose.

**Why this agent over other options**: Standup Generator was considered but overlaps with Status Update (single-task focused). Complexity Estimator was considered but requires per-task invocation. Backlog Review is board-level, proactive rather than reactive, and addresses a pain point every team has — the messy backlog before planning.

**What I changed**: Positioning in the `AI_ACTIONS` list — Backlog Review sits between Prioritize and Decompose in the UI, which groups the board-level agents (Prioritize, Backlog Review) above the task-specific ones (Decompose, Status Update).

---

## What Claude did well

- **Context retention**: Conventions from `.claude/` were followed consistently across multiple agent sessions and PR reviews without repeated reminders
- **GitHub workflow**: Every commit, branch, PR, and merge went through MCP — zero manual git
- **Architecture decisions**: The shared `runAgentLoop` pattern, the `parentId`-as-subtask design, and the selective context loading were all Claude suggestions that held up through the build
- **Post-merge integration**: Finding and explaining the null coercion bug, the type boundary gaps, and the stub conflict — all diagnosed and fixed without help

## What needed human judgment

- **Scope decisions**: Choosing which 3 of 4 AI features to implement (I prioritized A, B, C over D)
- **Parallel agent strategy**: The decision to spawn 3 parallel agents came from me; Claude implemented it
- **Clarification UX**: Recognizing that the decompose flow had a product gap (agent asks question, UI has no reply mechanism) was a manual insight the automated review missed
- **Commit message style**: Kept conventional commits clean; Claude occasionally added `Co-Authored-By` lines (removed after feedback)

---

## Process summary

| PR | Branch | Who did it |
|----|--------|----------|
| #1 | `chore/claude-setup` | Claude Code (main session) |
| #2 | `chore/setup-deps` | Claude Code (main session) |
| #3 | `feat/data-layer` | Sub-agent (parallel) |
| #4 | `feat/ai-agents` | Sub-agent (parallel) |
| #5 | `feat/task-ui` | Sub-agent (parallel) |
| #6 | `fix/type-errors` | Claude Code (post-merge integration) |
| #7 | `fix/toplevel-tasks-query` | Claude Code (post-merge review) |
| #8 | `fix/polish` | Claude Code (after `/review` pass) |
| #9 | `docs/readme-agentlog` | Claude Code (main session) |
