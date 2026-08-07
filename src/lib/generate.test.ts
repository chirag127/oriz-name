import { describe, expect, it } from 'vitest'
import {
  generateNames,
  makeRng,
  scoreName,
  VIBES,
  KINDS,
  type GenOptions,
} from './generate'

describe('makeRng', () => {
  it('is deterministic for a given seed', () => {
    const a = makeRng(42)
    const b = makeRng(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('produces values in [0,1)', () => {
    const r = makeRng(7)
    for (let i = 0; i < 100; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('scoreName', () => {
  it('rewards mid-length pronounceable names', () => {
    expect(scoreName('Lumio')).toBeGreaterThan(scoreName('Xkzptqrn'))
  })
  it('clamps to 1..100', () => {
    expect(scoreName('a')).toBeGreaterThanOrEqual(1)
    expect(scoreName('Lumina')).toBeLessThanOrEqual(100)
  })
  it('penalizes long consonant runs', () => {
    expect(scoreName('strkngth')).toBeLessThan(scoreName('kalio'))
  })
})

const base: GenOptions = {
  keywords: ['spark', 'flow'],
  vibe: 'techy',
  kind: 'startup',
  count: 12,
  seed: 123,
}

describe('generateNames', () => {
  it('returns the requested count', () => {
    expect(generateNames(base)).toHaveLength(12)
  })
  it('is deterministic for a fixed seed', () => {
    expect(generateNames(base)).toEqual(generateNames({ ...base }))
  })
  it('changes with the seed', () => {
    const a = generateNames({ ...base, seed: 1 }).map((r) => r.name)
    const b = generateNames({ ...base, seed: 2 }).map((r) => r.name)
    expect(a).not.toEqual(b)
  })
  it('produces unique names', () => {
    const names = generateNames({ ...base, count: 20 }).map((r) => r.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
  })
  it('sorts by score descending', () => {
    const scores = generateNames(base).map((r) => r.score)
    const sorted = [...scores].sort((a, b) => b - a)
    expect(scores).toEqual(sorted)
  })
  it('respects maxLen', () => {
    const r = generateNames({ ...base, maxLen: 8, count: 20 })
    for (const n of r) expect(n.name.length).toBeLessThanOrEqual(8)
  })
  it('makes @handles for usernames', () => {
    const r = generateNames({ ...base, kind: 'username' })
    for (const n of r) expect(n.handle.startsWith('@')).toBe(true)
  })
  it('makes kebab handles for repos', () => {
    const r = generateNames({ ...base, kind: 'repo' })
    for (const n of r) {
      expect(n.handle).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(n.name).toBe(n.name.toLowerCase())
    }
  })
  it('makes .com handles for brands', () => {
    const r = generateNames({ ...base, kind: 'brand' })
    for (const n of r) expect(n.handle.endsWith('.com')).toBe(true)
  })
  it('works with no keywords (falls back to seedwords)', () => {
    const r = generateNames({ ...base, keywords: [] })
    expect(r.length).toBeGreaterThan(0)
  })
  it('handles every vibe x kind combo', () => {
    for (const vibe of VIBES) {
      for (const kind of KINDS) {
        const r = generateNames({ keywords: ['blue'], vibe, kind, count: 5, seed: 9 })
        expect(r.length).toBeGreaterThan(0)
      }
    }
  })
})
