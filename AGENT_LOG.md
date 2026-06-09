# AGENT_LOG — AI-Assisted Development Journal

This file tracks how Claude Code was used throughout the development of DevLog. Honest account of what worked, what needed manual intervention, and why.

---

## Setup: Claude Code infrastructure

**What I asked Claude to do**: Set up the full Claude Code project structure — `CLAUDE.md`, `AGENTS.md`, `.claude/` directory with architecture, conventions, github rules, and a custom `/review` command.

**What Claude did**: Generated all files in one pass. The separation of concerns (one file per domain) was Claude's suggestion, not mine — originally I thought one big CLAUDE.md would do. Claude argued correctly that loading a 300-line file on every prompt wastes context.

**What I changed**: Minor wording in `.claude/github.md` to match our actual branch flow.

---

## Phase 1: Data layer (SQLite + API routes)

_To be filled as work progresses_

---

## Phase 2: Task UI

_To be filled as work progresses_

---

## Phase 3: AI agents

_To be filled as work progresses_

---

## Phase 1: Shared setup (deps + types)

**What I asked Claude to do**: Install `better-sqlite3`, `@anthropic-ai/sdk`, `nanoid` and create `lib/types.ts` with shared `Task` type — so all parallel agents branch from a consistent base.

**Why this order matters**: Three agents will work simultaneously on data layer, UI, and AI infrastructure. If they all tried to define `Task` independently, we'd get type drift. Doing it once upfront means every agent imports from `@/lib/types`.

---

## Phase 2: Parallel agents — data layer + UI + AI infrastructure

**What I asked Claude to do**: Spawn three sub-agents simultaneously using `Agent` tool with `isolation: "worktree"`:
- Agent 1 (`feat/data-layer`): `lib/db.ts` + all CRUD API routes
- Agent 2 (`feat/task-ui`): React components + page layout + Tailwind styling
- Agent 3 (`feat/ai-agents`): `lib/agents/loop.ts` + 3 agent implementations + AI API routes

**Why parallel**: These three concerns touch different parts of the codebase with minimal overlap. Running them sequentially would be 3× slower. Claude Code's sub-agent + worktree isolation makes true parallelism possible without file conflicts.

**What Claude did**: Each agent got a detailed prompt with file paths, type definitions, and conventions from `.claude/`. Each created its own branch, committed, pushed, and opened a PR.

**What I changed / where I intervened**: _To be filled after agents complete_

---

## Observations so far

- Next.js 16 auto-generates both `CLAUDE.md` and `AGENTS.md` via `create-next-app` — the ecosystem is catching up to agent-assisted development natively
- The `AGENTS.md` warning about breaking changes is genuinely useful: Next.js 16 has different config patterns from 14/15 and Claude's training data would be wrong without it
- GitHub MCP made the repo creation + branch setup completely hands-free from the terminal
