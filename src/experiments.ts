/**
 * Experiment definitions shared by the worker (server actions) and the UI.
 *
 * Each experiment is a classic, well-replicated cognitive-science effect that
 * works in a lecture hall in under a minute. Between-subjects experiments have
 * two conditions; the server assigns one at join time so a participant can't
 * pick (or see) their own condition.
 */

export type ExperimentId = 'anchoring' | 'framing' | 'stroop'

export interface ExperimentDef {
  id: ExperimentId
  name: string
  tagline: string
  /** Between-subjects conditions. Empty = within-subjects (everyone does everything). */
  conditions: string[]
  conditionLabels: Record<string, string>
  /** Query sent to Google Scholar to ground the AI explanation in real papers. */
  scholarQuery: string
  /** What the effect predicts, in one line — shown to the host after reveal. */
  prediction: string
}

export const EXPERIMENTS: Record<ExperimentId, ExperimentDef> = {
  anchoring: {
    id: 'anchoring',
    name: 'Anchoring',
    tagline: 'Does an absurd number change your best guess?',
    conditions: ['low', 'high'],
    conditionLabels: { low: 'Anchor: 9', high: 'Anchor: 140' },
    scholarQuery: 'anchoring effect implausible anchors Gandhi age Strack Mussweiler',
    prediction: 'The "140" group should guess a noticeably higher age than the "9" group.',
  },
  framing: {
    id: 'framing',
    name: 'Framing',
    tagline: 'Same outcomes, different words — does the choice flip?',
    conditions: ['gain', 'loss'],
    conditionLabels: { gain: 'Framed as lives saved', loss: 'Framed as lives lost' },
    scholarQuery: 'framing of decisions psychology of choice Tversky Kahneman 1981',
    prediction: 'More people pick the sure option when it is framed as lives saved.',
  },
  stroop: {
    id: 'stroop',
    name: 'Stroop',
    tagline: 'Name the ink color, not the word.',
    conditions: [],
    conditionLabels: {},
    scholarQuery: 'Stroop effect interference color naming reaction time',
    prediction: 'Incongruent trials (RED printed in blue) should be slower than congruent ones.',
  },
}

export const ANCHORS: Record<string, number> = { low: 9, high: 140 }

/** Stroop stimuli. */
export const STROOP_COLORS = [
  { name: 'RED', css: '#dc2626' },
  { name: 'BLUE', css: '#2563eb' },
  { name: 'GREEN', css: '#16a34a' },
  { name: 'YELLOW', css: '#ca8a04' },
] as const
export const STROOP_TRIALS = 16

// ── Shapes stored in records ───────────────────────────────────────────────

export interface Session {
  code: string
  hostId: string
  title: string
  experiment: ExperimentId
  phase: 'open' | 'closed'
  explanation?: string
  sources?: Source[]
  explainedAt?: number
}

export interface Source {
  title: string
  link: string
  info: string
}

export interface ResponseRow {
  sessionId: string
  userId: string
  condition: string
  submitted: boolean
  /** anchoring: estimated age */
  estimate?: number
  /** framing: 'sure' | 'risky' */
  choice?: string
  /** stroop: mean RTs (ms) for correct trials */
  congruentMs?: number
  incongruentMs?: number
  accuracy?: number
}

// ── Statistics (pure; used by the live charts and by the AI action) ────────

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export interface Summary {
  n: number
  lines: string[]
}

/** Summarizes submitted responses into plain-text lines (UI + LLM prompt). */
export function summarize(experiment: ExperimentId, rows: ResponseRow[]): Summary {
  const done = rows.filter((r) => r.submitted)
  const fmt = (v: number | null, d = 1) => (v === null ? 'n/a' : v.toFixed(d))
  const lines: string[] = []
  if (experiment === 'anchoring') {
    for (const c of ['low', 'high']) {
      const xs = done.filter((r) => r.condition === c && typeof r.estimate === 'number').map((r) => r.estimate!)
      lines.push(`Anchor ${ANCHORS[c]}: n=${xs.length}, mean estimate=${fmt(mean(xs))}, median=${fmt(median(xs))}`)
    }
  } else if (experiment === 'framing') {
    for (const c of ['gain', 'loss']) {
      const rs = done.filter((r) => r.condition === c && r.choice)
      const sure = rs.filter((r) => r.choice === 'sure').length
      const pct = rs.length ? (100 * sure) / rs.length : null
      lines.push(`${c === 'gain' ? 'Gain frame' : 'Loss frame'}: n=${rs.length}, chose sure option=${sure} (${fmt(pct, 0)}%)`)
    }
  } else {
    const rs = done.filter((r) => typeof r.congruentMs === 'number' && typeof r.incongruentMs === 'number')
    const con = mean(rs.map((r) => r.congruentMs!))
    const inc = mean(rs.map((r) => r.incongruentMs!))
    const slower = rs.filter((r) => r.incongruentMs! > r.congruentMs!).length
    lines.push(`n=${rs.length}`)
    lines.push(`Mean congruent RT=${fmt(con, 0)} ms, mean incongruent RT=${fmt(inc, 0)} ms`)
    lines.push(`Stroop interference=${con !== null && inc !== null ? (inc - con).toFixed(0) : 'n/a'} ms; ${slower}/${rs.length} people were slower on incongruent trials`)
    lines.push(`Mean accuracy=${fmt(mean(rs.map((r) => (r.accuracy ?? 0) * 100)), 0)}%`)
  }
  return { n: done.length, lines }
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I/O to avoid misreads on a projector
export function makeCode(): string {
  let s = ''
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return s
}
