import { describe, it, expect } from 'vitest'
import {
  proseBefore,
  parsePrioritizeRef,
  parseFlaggedRefs,
  PRIORITIZE_SENTINEL,
  FLAGGED_SENTINEL,
} from '@/lib/agents/output'

describe('proseBefore', () => {
  it('returns everything before the sentinel, trimmed', () => {
    expect(proseBefore(`Start with X.\n\n${FLAGGED_SENTINEL}\n[]`, FLAGGED_SENTINEL)).toBe('Start with X.')
  })

  it('returns full text when sentinel is absent', () => {
    expect(proseBefore('Still streaming pros', FLAGGED_SENTINEL)).toBe('Still streaming pros')
  })

  it('cuts at the first sentinel occurrence', () => {
    const text = `a${FLAGGED_SENTINEL}b${FLAGGED_SENTINEL}c`
    expect(proseBefore(text, FLAGGED_SENTINEL)).toBe('a')
  })
})

describe('parsePrioritizeRef', () => {
  it('parses the {id,title} object after the --- separator', () => {
    const text = `**Fix auth**\n• reason\n---\n{"id":"abc123","title":"Fix auth"}`
    // the agent emits prose\n---\nJSON — full sentinel is "\n---\n"
    expect(parsePrioritizeRef(text)).toEqual({ id: 'abc123', title: 'Fix auth' })
  })

  it('returns null when there is no separator', () => {
    expect(parsePrioritizeRef('just prose, no json')).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    expect(parsePrioritizeRef('prose\n---\n{not json')).toBeNull()
  })

  it('returns null when the shape is wrong', () => {
    expect(parsePrioritizeRef('prose\n---\n{"id":123,"title":"x"}')).toBeNull()
    expect(parsePrioritizeRef('prose\n---\n{"title":"missing id"}')).toBeNull()
  })

  it('display sentinel matches what the prose split uses', () => {
    // regression guard: the modal splits display text on PRIORITIZE_SENTINEL
    const text = `prose\n---\n{"id":"a","title":"t"}`
    expect(proseBefore(text, PRIORITIZE_SENTINEL)).toBe('prose')
  })
})

describe('parseFlaggedRefs', () => {
  it('parses the array after the [FLAGGED_JSON] marker', () => {
    const text = `• **Fix auth** — vague.\n2 of 5 open tasks need attention.\n${FLAGGED_SENTINEL}\n[{"id":"a","title":"Fix auth"},{"id":"b","title":"Refactor"}]`
    expect(parseFlaggedRefs(text)).toEqual([
      { id: 'a', title: 'Fix auth' },
      { id: 'b', title: 'Refactor' },
    ])
  })

  it('returns [] when the marker is absent', () => {
    expect(parseFlaggedRefs('clean backlog, nothing flagged')).toEqual([])
  })

  it('returns [] for malformed JSON', () => {
    expect(parseFlaggedRefs(`prose\n${FLAGGED_SENTINEL}\n[{"id":`)).toEqual([])
  })

  it('returns [] when any element has the wrong shape', () => {
    expect(parseFlaggedRefs(`prose\n${FLAGGED_SENTINEL}\n[{"id":"a"}]`)).toEqual([])
  })

  it('tolerates a markdown horizontal rule in the prose (the original sentinel-collision bug)', () => {
    const text = `Report:\n---\n• **Fix auth** — vague.\n${FLAGGED_SENTINEL}\n[{"id":"a","title":"Fix auth"}]`
    expect(parseFlaggedRefs(text)).toEqual([{ id: 'a', title: 'Fix auth' }])
    expect(proseBefore(text, FLAGGED_SENTINEL)).toContain('• **Fix auth** — vague.')
  })
})
