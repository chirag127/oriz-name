import { describe, expect, it } from 'vitest'
import { estimateAvailability } from './availability'

describe('estimateAvailability', () => {
  it('returns clamped likelihood 3..97', () => {
    for (const n of ['a', 'go', 'lumina', 'quixotropolis', 'app']) {
      const r = estimateAvailability(n)
      expect(r.likelihood).toBeGreaterThanOrEqual(3)
      expect(r.likelihood).toBeLessThanOrEqual(97)
    }
  })
  it('marks very short names as less available', () => {
    expect(estimateAvailability('go').likelihood).toBeLessThan(
      estimateAvailability('everbloomery').likelihood,
    )
  })
  it('flags common words as likely taken', () => {
    expect(estimateAvailability('app').label).toBe('likely taken')
  })
  it('always emits check links incl .com + github', () => {
    const r = estimateAvailability('lumio')
    const labels = r.links.map((l) => l.label)
    expect(labels.some((l) => l.includes('.com'))).toBe(true)
    expect(labels.some((l) => l.includes('GitHub'))).toBe(true)
    expect(r.links.every((l) => l.href.startsWith('https://'))).toBe(true)
  })
  it('gives at least one reason', () => {
    expect(estimateAvailability('lumio').reasons.length).toBeGreaterThan(0)
  })
})
