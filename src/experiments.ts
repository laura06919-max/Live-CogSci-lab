/**
 * Experiment definitions shared by the worker (server actions) and the UI.
 *
 * Each experiment is a classic, well-replicated cognitive-science effect that
 * works in a lecture hall in under a minute. Between-subjects experiments have
 * two conditions; the server assigns one at join time so a participant can't
 * pick (or see) their own condition.
 */

export type ExperimentId = 'anchoring' | 'framing' | 'stroop'

/** Cognitive-science areas used to organize a student's lab notebook. */
export const AREAS = ['Judgment & decision-making', 'Cognitive control & attention'] as const
export type Area = (typeof AREAS)[number]

export interface ExperimentDef {
  id: ExperimentId
  name: string
  tagline: string
  /** Area of cognitive science, for the student's lab notebook. */
  area: Area
  /** Rough time a participant needs. */
  minutes: string
  /** What participants do, described neutrally (safe to show before taking part). */
  task: string
  /** One fixed sentence a student keeps (same for everyone, so it isn't per-person AI output). */
  takeaway: string
  /**
   * Neutral label shown before the reveal (projector, phones, notebook).
   * Naming the effect or explaining it before people answer would prime them.
   */
  neutralLabel: string
  /** Post-reveal "Why this matters" content, curated (not AI-generated). */
  why: {
    method: string
    concepts: string[]
    realLife: string[]
    reflection: string
  }
  /** Between-subjects conditions. Empty = within-subjects (everyone does everything). */
  conditions: string[]
  conditionLabels: Record<string, string>
  /**
   * Canonical papers for this effect. These are fixed on purpose: Claude may
   * cite only these, and Google Scholar is used just to look up each one's
   * link (accepted only if the returned title matches).
   */
  canonical: { title: string; cite: string }[]
  /** The prediction question participants answer before the reveal. */
  predictQuestion: string
  /** One-line summary of the published result, shown in the "Evidence" column. */
  research: string
  /** What the effect predicts, in one line — shown to the host after reveal. */
  prediction: string
}

export const EXPERIMENTS: Record<ExperimentId, ExperimentDef> = {
  anchoring: {
    id: 'anchoring',
    name: 'Anchoring',
    tagline: 'Does an absurd number change your best guess?',
    area: 'Judgment & decision-making',
    minutes: '~1 min',
    task: 'Answer one yes/no question, then make one numerical estimate.',
    takeaway: 'A number you see first can pull later estimates toward it, even when that number is obviously unrealistic.',
    neutralLabel: 'Estimation study',
    why: {
      method: 'Between-subjects experiment: random assignment to one of two anchors (independent variable); your age estimate is the dependent variable; the effect is a difference in group means.',
      concepts: ['Heuristics and biases', 'Anchoring-and-adjustment', 'Random assignment', 'Independent vs. dependent variable', 'Comparing two group means'],
      realLife: [
        'The first number put on the table in a salary or price negotiation',
        '"Originally $120, now $59" price tags',
        'Suggested donation or tip amounts',
        'The first time estimate someone throws out in a group project',
      ],
      reflection: 'Where have you recently seen a first number shape what you thought was reasonable — a price, a grade estimate, a deadline?',
    },
    conditions: ['low', 'high'],
    conditionLabels: { low: 'Anchor: 9', high: 'Anchor: 140' },
    canonical: [
      {
        title: 'Explaining the enigmatic anchoring effect: Mechanisms of selective accessibility',
        cite: 'Strack & Mussweiler (1997), Journal of Personality and Social Psychology — the original Gandhi 9 vs. 140 study',
      },
      {
        title: 'Judgment under uncertainty: Heuristics and biases',
        cite: 'Tversky & Kahneman (1974), Science',
      },
    ],
    predictQuestion: 'How many years apart will the two groups\' average guesses be?',
    research: 'Strack & Mussweiler (1997): average guesses of about 50 after the anchor 9 vs. about 67 after 140, a gap of roughly 17 years.',
    prediction: 'The "140" group should guess a noticeably higher age than the "9" group.',
  },
  framing: {
    id: 'framing',
    name: 'Framing',
    tagline: 'Same outcomes, different words — does the choice flip?',
    area: 'Judgment & decision-making',
    minutes: '~1 min',
    task: 'Read a short scenario and choose between two programs.',
    takeaway: 'Describing the same outcome as a gain or a loss changes how much risk people are willing to take.',
    neutralLabel: 'Decision-making study',
    why: {
      method: 'Between-subjects experiment: identical options described as lives saved vs. lives lost (independent variable); choice of the sure vs. risky option is the dependent variable, compared as proportions.',
      concepts: ['Framing effects', 'Prospect theory and loss aversion', 'Risk preference', 'Random assignment', 'Comparing two proportions'],
      realLife: [
        '"95% fat-free" vs. "5% fat" on food labels',
        'A treatment described by its survival rate vs. its mortality rate',
        '"Early-registration discount" vs. "late-registration fee"',
        'How a policy or news headline words its numbers',
      ],
      reflection: 'Think of a choice you made recently. Would you have chosen differently if the same facts had been described as a loss instead of a gain?',
    },
    conditions: ['gain', 'loss'],
    conditionLabels: { gain: 'Framed as lives saved', loss: 'Framed as lives lost' },
    canonical: [
      {
        title: 'The framing of decisions and the psychology of choice',
        cite: 'Tversky & Kahneman (1981), Science — the original "disease problem"',
      },
      {
        title: 'The influence of framing on risky decisions: A meta-analysis',
        cite: 'Kühberger (1998), Organizational Behavior and Human Decision Processes',
      },
    ],
    predictQuestion: 'Which wording will make MORE people choose the sure option (Program A)?',
    research: 'Tversky & Kahneman (1981): 72% chose the sure option when framed as lives saved vs. 22% when framed as lives lost.',
    prediction: 'More people pick the sure option when it is framed as lives saved.',
  },
  stroop: {
    id: 'stroop',
    name: 'Stroop',
    tagline: 'Name the ink color, not the word.',
    area: 'Cognitive control & attention',
    minutes: '~1 min',
    task: `Tap the matching button for ${16} quick on-screen trials, as fast as you can.`,
    takeaway: 'Reading is so automatic that it interferes with naming the ink color; overriding it takes control, and time.',
    neutralLabel: 'Reaction-time study',
    why: {
      method: 'Within-subjects experiment: everyone does both congruent and incongruent trials; reaction time is the dependent variable, compared within each person.',
      concepts: ['Automatic vs. controlled processing', 'Selective attention', 'Cognitive control / executive function', 'Within-subjects design', 'Reaction time as a measure'],
      realLife: [
        'Reading a notification while trying to listen in lecture',
        'Typing one thing while someone says a different word out loud',
        'Following a sign that conflicts with a habit (e.g. a detour on your usual route)',
        'Why habits are hard to override when you are tired or rushed',
      ],
      reflection: 'What is something you do so automatically that it gets in the way when the situation asks for something different?',
    },
    conditions: [],
    conditionLabels: {},
    canonical: [
      {
        title: 'Studies of interference in serial verbal reactions',
        cite: 'Stroop (1935), Journal of Experimental Psychology',
      },
      {
        title: 'Half a century of research on the Stroop effect: An integrative review',
        cite: 'MacLeod (1991), Psychological Bulletin',
      },
    ],
    predictQuestion: 'On average, how many milliseconds slower will mismatched words (RED in blue) be?',
    research: 'Mismatched words are reliably slower to name. It is one of the most replicated effects in psychology (MacLeod, 1991).',
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
  /** Absent until the host first reveals; absent or 'open' both mean open. */
  phase?: 'open' | 'closed'
  explanation?: string
  sources?: Source[]
  explainedAt?: number
  /** Room-level stats, computed server-side at reveal. Participants can't read others' rows, so they read this. */
  stats?: RoomStats
}

export interface Source {
  title: string
  /** Human-readable citation (authors, year, venue). */
  info: string
  /** Link found via Google Scholar; empty when no matching result was found. */
  link: string
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
  /**
   * The participant's prediction of the room-level effect, made after answering
   * and before the reveal. anchoring/stroop: number (years / ms);
   * framing: 'gain' | 'loss' | 'same' stored in predictedFrame.
   */
  prediction?: number
  predictedFrame?: string
  /** [hostId] — lets the host read every row while participants read only their own. */
  collaborators?: string[]
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

export interface GroupStats {
  n: number
  mean?: number | null
  median?: number | null
  sure?: number
  pct?: number | null
}

export interface RoomStats {
  n: number
  groups: Record<string, GroupStats>
  /** anchoring: high − low mean (years); framing: gain% − loss% sure; stroop: incongruent − congruent (ms). */
  effect: number | null
  /** stroop only: mean RTs */
  congruentMs?: number | null
  incongruentMs?: number | null
  /** The room's prediction of the effect (mean for numbers; vote counts for framing). */
  predicted: number | null
  predictedVotes?: Record<string, number>
  summary: string[]
}

/** One function for host charts, participant debrief and the AI prompt. */
export function computeStats(experiment: ExperimentId, rows: ResponseRow[]): RoomStats {
  const done = rows.filter((r) => r.submitted)
  const groups: Record<string, GroupStats> = {}
  let effect: number | null = null
  const out: Partial<RoomStats> = {}
  if (experiment === 'anchoring') {
    for (const c of ['low', 'high']) {
      const xs = done.filter((r) => r.condition === c && typeof r.estimate === 'number').map((r) => r.estimate!)
      groups[c] = { n: xs.length, mean: mean(xs), median: median(xs) }
    }
    if (groups.low.mean != null && groups.high.mean != null) effect = groups.high.mean - groups.low.mean
  } else if (experiment === 'framing') {
    for (const c of ['gain', 'loss']) {
      const rs = done.filter((r) => r.condition === c && r.choice)
      const sure = rs.filter((r) => r.choice === 'sure').length
      groups[c] = { n: rs.length, sure, pct: rs.length ? (100 * sure) / rs.length : null }
    }
    if (groups.gain.pct != null && groups.loss.pct != null) effect = groups.gain.pct - groups.loss.pct
    const votes: Record<string, number> = { gain: 0, loss: 0, same: 0 }
    for (const r of done) if (r.predictedFrame && r.predictedFrame in votes) votes[r.predictedFrame]++
    out.predictedVotes = votes
  } else {
    const rs = done.filter((r) => typeof r.congruentMs === 'number' && typeof r.incongruentMs === 'number')
    out.congruentMs = mean(rs.map((r) => r.congruentMs!))
    out.incongruentMs = mean(rs.map((r) => r.incongruentMs!))
    groups.within = { n: rs.length }
    if (out.congruentMs != null && out.incongruentMs != null) effect = out.incongruentMs - out.congruentMs
  }
  const preds = done.filter((r) => typeof r.prediction === 'number').map((r) => r.prediction!)
  const stats: RoomStats = {
    n: done.length,
    groups,
    effect,
    predicted: experiment === 'framing' ? null : mean(preds),
    ...out,
    summary: [],
  }
  stats.summary = [...summarize(experiment, rows).lines, predictionLine(experiment, stats)]
  return stats
}

function predictionLine(experiment: ExperimentId, s: RoomStats): string {
  if (experiment === 'framing') {
    const v = s.predictedVotes ?? {}
    return `Room's prediction before the reveal — which frame gets more "sure" picks: gain=${v.gain ?? 0}, loss=${v.loss ?? 0}, no difference=${v.same ?? 0}`
  }
  const unit = experiment === 'anchoring' ? 'years' : 'ms'
  return `Room's average prediction of the effect before the reveal: ${s.predicted == null ? 'n/a' : s.predicted.toFixed(0)} ${unit} (actual: ${s.effect == null ? 'n/a' : s.effect.toFixed(0)} ${unit})`
}

/** Loose title match for validating a Scholar hit against a canonical paper. */
export function titleMatches(found: string, canonical: string): boolean {
  const norm = (t: string) => t.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
  const a = norm(found)
  const b = norm(canonical)
  return a.length > 10 && (a.includes(b.slice(0, 30)) || b.includes(a.slice(0, 30)))
}

/** "Me" and "Us" sentences for one participant after the reveal (debrief + lab notebook). */
export function personalLines(session: Session, mine: ResponseRow): { me: string; us: string } {
  const exp = EXPERIMENTS[session.experiment]
  const stats = session.stats!
  const g = stats.groups
  const other = exp.conditions.find((c) => c !== mine.condition)
  const f = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(0))

  let me: string
  let us: string
  if (exp.id === 'anchoring') {
    me = `You saw the ${mine.condition === 'high' ? 'high' : 'low'} anchor: ${ANCHORS[mine.condition]}. You guessed ${mine.estimate}.`
    us = `Your group averaged ${f(g[mine.condition]?.mean)}; the ${ANCHORS[other ?? 'low']}-anchor group averaged ${f(g[other ?? 'low']?.mean)}. The room showed a ${f(stats.effect)}-year anchoring gap.`
  } else if (exp.id === 'framing') {
    const yours = mine.condition === 'gain' ? '"200 people will be saved"' : '"400 people will die"'
    me = `You saw the ${mine.condition === 'gain' ? 'lives-saved' : 'lives-lost'} wording (${yours}) and chose the ${mine.choice === 'sure' ? 'sure option (A)' : 'gamble (B)'}.`
    us = `${f(g[mine.condition]?.pct)}% of your group chose the sure option, vs. ${f(g[other ?? 'gain']?.pct)}% of the other group, who saw the same choice worded the other way.`
  } else {
    const gap = mine.incongruentMs != null && mine.congruentMs != null ? mine.incongruentMs - mine.congruentMs : null
    me = `You averaged ${f(mine.congruentMs)} ms on matching words and ${f(mine.incongruentMs)} ms on mismatched ones: ${gap == null ? '—' : gap >= 0 ? `${gap} ms slower` : `${-gap} ms faster`}.`
    us = `The room's average interference was ${f(stats.effect)} ms (${f(stats.congruentMs)} vs. ${f(stats.incongruentMs)} ms).`
  }

  return { me, us }
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I/O to avoid misreads on a projector
export function makeCode(): string {
  let s = ''
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return s
}
