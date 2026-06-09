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

## Observations so far

- Next.js 16 auto-generates both `CLAUDE.md` and `AGENTS.md` via `create-next-app` — the ecosystem is catching up to agent-assisted development natively
- The `AGENTS.md` warning about breaking changes is genuinely useful: Next.js 16 has different config patterns from 14/15 and Claude's training data would be wrong without it
- GitHub MCP made the repo creation + branch setup completely hands-free from the terminal
