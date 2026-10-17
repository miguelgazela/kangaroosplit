import { describe, expect, it } from 'vitest'
import type { ChangelogEntry } from '../data/changelog'
import { compareVersions, pendingHighlights } from './whatsNew'

const highlight = [{ title: 'T', text: 'x', icon: 'plus', tone: 'accent' }] as ChangelogEntry['highlights']
const entry = (version: string, highlights?: ChangelogEntry['highlights']): ChangelogEntry => ({
  version,
  date: '2026-10-17',
  changes: [],
  highlights,
})
const log = [entry('1.5.0'), entry('1.4.0', highlight), entry('1.3.0', highlight), entry('1.2.0')]

describe('compareVersions', () => {
  it('compares numbers, not text', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1)
    expect(compareVersions('1.4.0', '1.4.0')).toBe(0)
    expect(compareVersions('1.2.0', '1.4.0')).toBe(-1)
  })
})

describe('pendingHighlights', () => {
  it('shows nothing on a brand-new install', () => {
    expect(pendingHighlights(log, null, false)).toBeNull()
  })

  it('shows the newest highlights to someone who used the app before', () => {
    expect(pendingHighlights(log, null, true)?.version).toBe('1.4.0')
  })

  it('shows nothing when already on the newest version', () => {
    expect(pendingHighlights(log, '1.5.0', true)).toBeNull()
  })

  it('shows nothing when the new versions have no highlights', () => {
    expect(pendingHighlights(log, '1.4.0', true)).toBeNull()
  })

  it('picks the newest entry with highlights after the last seen one', () => {
    expect(pendingHighlights(log, '1.2.0', true)?.version).toBe('1.4.0')
    expect(pendingHighlights(log, '1.3.0', true)?.version).toBe('1.4.0')
  })

  it('shows at most three', () => {
    const many = [entry('2.0.0', [...highlight!, ...highlight!, ...highlight!, ...highlight!])]
    expect(pendingHighlights(many, '1.0.0', true)?.highlights).toHaveLength(3)
  })
})
