@AGENTS.md
@.claude/architecture.md
@.claude/conventions.md
@.claude/github.md

# DevLog

AI-powered task tracker for engineering teams. Built with Next.js 16 App Router, SQLite, and Claude API agents.

## What this project does

DevLog lets engineers track tasks (CRUD with status/priority) and removes friction via three AI agents:
- **Prioritization agent** — analyzes all tasks and recommends where to start the day, with reasoning
- **Decomposition agent** — breaks a task into subtasks; asks a clarifying question if the task is vague
- **Status update agent** — drafts a Slack-style async update based on task + subtask state

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
