import { randomBytes } from 'crypto'
import { tmpdir } from 'os'
import path from 'path'

// Each test worker gets its own throwaway SQLite file.
// Runs before any test file imports lib/db (which reads DB_PATH at module load).
process.env.DB_PATH = path.join(tmpdir(), `devlog-test-${randomBytes(6).toString('hex')}.db`)
