import { describe, expect, it } from 'vitest'
import { computeStats, makeCode, mean, median, summarize, titleMatches, type ResponseRow } from './experiments'

const row = (p: Partial<ResponseRow>): ResponseRow => ({
  sessionId: 's', userId: Math.random().toString(), condition: 'within', submitted: true, ...p,
})

describe('stats', () => {
  it('mean/median handle empty and even lengths', () => {
    expect(mean([])).toBeNull()
    expect(median([1, 3, 2, 10])).toBe(2.5)
  })

  it('anchoring summary splits by condition and ignores unsubmitted rows', () => {
    const s = summarize('anchoring', [
      row({ condition: 'low', estimate: 50 }),
      row({ condition: 'low', estimate: 60 }),
      row({ condition: 'high', estimate: 90 }),
      row({ condition: 'high', estimate: 999, submitted: false }),
    ])
    expect(s.n).toBe(3)
    expect(s.lines[0]).toContain('n=2, mean estimate=55.0')
    expect(s.lines[1]).toContain('n=1, mean estimate=90.0')
  })

  it('framing summary computes % sure per frame', () => {
    const s = summarize('framing', [
      row({ condition: 'gain', choice: 'sure' }),
      row({ condition: 'gain', choice: 'risky' }),
      row({ condition: 'loss', choice: 'risky' }),
    ])
    expect(s.lines[0]).toContain('chose sure option=1 (50%)')
    expect(s.lines[1]).toContain('chose sure option=0 (0%)')
  })

  it('stroop summary reports interference', () => {
    const s = summarize('stroop', [
      row({ congruentMs: 600, incongruentMs: 750, accuracy: 1 }),
      row({ congruentMs: 700, incongruentMs: 690, accuracy: 0.9 }),
    ])
    expect(s.lines.join(' ')).toContain('interference=70 ms; 1/2 people')
  })

  it('codes avoid ambiguous letters', () => {
    for (let i = 0; i < 200; i++) expect(makeCode()).toMatch(/^[A-HJ-NP-Z]{5}$/)
  })
})

describe('computeStats (room stats published at reveal)', () => {
  it('anchoring: effect = high mean − low mean, prediction averaged', () => {
    const s = computeStats('anchoring', [
      row({ condition: 'low', estimate: 50, prediction: 10 }),
      row({ condition: 'high', estimate: 80, prediction: 20 }),
      row({ condition: 'high', estimate: 999, submitted: false }),
    ])
    expect(s.n).toBe(2)
    expect(s.effect).toBe(30)
    expect(s.predicted).toBe(15)
    expect(s.summary.at(-1)).toContain('15 years (actual: 30 years)')
  })

  it('framing: effect in percentage points and prediction votes', () => {
    const s = computeStats('framing', [
      row({ condition: 'gain', choice: 'sure', predictedFrame: 'same' }),
      row({ condition: 'loss', choice: 'risky', predictedFrame: 'gain' }),
    ])
    expect(s.effect).toBe(100)
    expect(s.predictedVotes).toEqual({ gain: 1, loss: 0, same: 1 })
  })
})

describe('titleMatches (validating Scholar hits against canonical papers)', () => {
  it('accepts the same paper with markup/case differences', () => {
    expect(titleMatches('The <b>framing</b> of decisions and the psychology of choice', 'The framing of decisions and the psychology of choice')).toBe(true)
  })
  it('rejects a different paper', () => {
    expect(titleMatches('Prospect theory: An analysis of decision under risk', 'The framing of decisions and the psychology of choice')).toBe(false)
  })
})
