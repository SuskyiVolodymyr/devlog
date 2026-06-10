@AGENTS.md

# DevLog

AI-powered task tracker for engineering teams. Built with Next.js 16 App Router, SQLite, and Claude API agents.

## What this project does

DevLog lets engineers track tasks (CRUD with status/priority) and removes friction via five AI features:
- **Prioritization agent** — analyzes all tasks and recommends where to start the day, with reasoning
- **Backlog review agent** — flags vague, stuck, or under-decomposed tasks before sprint planning
- **Decomposition agent** — breaks a task into subtasks; asks a clarifying question if the task is vague
- **Status update agent** — drafts a structured Slack-style async update based on task + subtask state
- **Improve with AI** — rewrites a rough task title/description into clear English from the task form

## Context map — read the relevant guide before working

`AGENTS.md` (imported above) holds the universal rules and always loads. The domain guides below load on demand — before touching an area, read its guide with the Read tool:

| If you are working on… | Read first |
|------------------------|------------|
| Data layer, schema, API routes, state management | `.claude/architecture.md` |
| Writing or refactoring code — naming, file layout, error handling, styling | `.claude/conventions.md` |
| Branches, commits, PRs, merges | `.claude/github.md` |
| AI agents in `lib/agents/` — prompts, output contracts, adding an agent | `docs/features/ai-agents.md` |

## Key directories

```
app/                  Next.js App Router pages and API routes
app/api/              REST API endpoints
lib/db.ts             All SQLite queries (single source of truth for data access)
lib/agents/           AI agent implementations (tool-use loop pattern)
components/           React components
.claude/              Claude Code config, conventions, commands
docs/features/        Feature specs loaded as context when implementing AI features
```

## Running locally

```bash
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm install
npm run dev
```
