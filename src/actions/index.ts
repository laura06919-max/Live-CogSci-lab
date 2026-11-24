/**
 * Server actions — the only way participants write responses.
 *
 * Why actions instead of client writes: the experiment's validity depends on
 * things a participant must not control — which condition they are in, and
 * whether they can answer after the host closes the session. Those checks
 * live here, on the server. The `responses` collection grants members no
 * create/update, so these actions are the only write path.
 */
import type { ActionHandler, ActionResult, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import {
  EXPERIMENTS,
  computeStats,
  titleMatches,
  type ExperimentId,
  type ResponseRow,
  type Session,
  type Source,
} from '../experiments'

type Envelope<T> = { recordId: string; data: T; createdBy?: string }

async function loadSession(tools: ActionTools, sessionId: unknown) {
  if (typeof sessionId !== 'string' || !sessionId) return null
  const r = await tools.get('sessions', sessionId)
  if (!r.success) return null
  return (r.data as unknown as { record: Envelope<Session> }).record
}

async function findMyResponse(tools: ActionTools, sessionId: string, userId: string) {
  const r = await tools.query('responses', { where: { sessionId, userId }, limit: 1 })
  if (!r.success) return null
  const rows = (r.data as unknown as { records: Envelope<ResponseRow>[] }).records
  return rows[0] ?? null
}

const fail = (error: string): ActionResult<never> => ({ success: false, error })

/** A session with no phase yet (just created) counts as open. */
const isOpen = (s: Session) => s.phase !== 'closed'

async function loadRows(tools: ActionTools, sessionId: string): Promise<ResponseRow[]> {
  const all = await tools.query('responses', { where: { sessionId }, limit: 1000 })
  if (!all.success) return []
  return (all.data as unknown as { records: Envelope<ResponseRow>[] }).records.map((r) => r.data)
}

/** Join a session: assign a random condition server-side (idempotent). */
const joinSession: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const session = await loadSession(tools, params.sessionId)
  if (!session) return fail('Session not found')
  const existing = await findMyResponse(tools, session.recordId, userId)
  if (existing) return { success: true, data: { responseId: existing.recordId } }
  if (!isOpen(session.data)) return fail('This session is closed')

  const conds = EXPERIMENTS[session.data.experiment].conditions
  // Balanced-ish random assignment: put the newcomer in the smaller group,
  // breaking ties randomly. Small classes otherwise end up lopsided.
  let condition = 'within'
  if (conds.length) {
    const rows = await loadRows(tools, session.recordId)
    const counts = conds.map((c) => rows.filter((r) => r.condition === c).length)
    const min = Math.min(...counts)
    const candidates = conds.filter((_, i) => counts[i] === min)
    condition = candidates[Math.floor(Math.random() * candidates.length)]
  }

  const created = await tools.create('responses', {
    sessionId: session.recordId,
    userId,
    // The host is the only other person allowed to read this row (read: 'shared').
    collaborators: [session.data.hostId],
    condition,
    submitted: false,
  })
  if (!created.success) {
    // uniqueOn race (double-tap): the row exists now, return it.
    const again = await findMyResponse(tools, session.recordId, userId)
    if (again) return { success: true, data: { responseId: again.recordId } }
    return created
  }
  return { success: true, data: { responseId: created.data.recordId } }
}

/** Submit an answer once, while the session is open. Validates per experiment. */
const submitResponse: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const session = await loadSession(tools, params.sessionId)
  if (!session) return fail('Session not found')
  if (!isOpen(session.data)) return fail('The host has closed this session')
  const mine = await findMyResponse(tools, session.recordId, userId)
  if (!mine) return fail('Join the session first')
  if (mine.data.submitted) return fail('You already answered')

  const exp = session.data.experiment
  const num = (v: unknown, lo: number, hi: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null
  let patch: Partial<ResponseRow>
  if (exp === 'anchoring') {
    const estimate = num(params.estimate, 0, 200)
    if (estimate === null) return fail('Enter an age between 0 and 200')
    patch = { estimate: Math.round(estimate) }
  } else if (exp === 'framing') {
    if (params.choice !== 'sure' && params.choice !== 'risky') return fail('Pick an option')
    patch = { choice: params.choice }
  } else {
    const congruentMs = num(params.congruentMs, 100, 10000)
    const incongruentMs = num(params.incongruentMs, 100, 10000)
    const accuracy = num(params.accuracy, 0, 1)
    if (congruentMs === null || incongruentMs === null || accuracy === null) {
      return fail('Stroop data looked invalid — try again')
    }
    patch = { congruentMs: Math.round(congruentMs), incongruentMs: Math.round(incongruentMs), accuracy }
  }
  // Prediction of the room-level effect (asked after answering, before the reveal). Optional.
  if (exp === 'framing') {
    if (params.predictedFrame === 'gain' || params.predictedFrame === 'loss' || params.predictedFrame === 'same') {
      patch.predictedFrame = params.predictedFrame
    }
  } else {
    const p = num(params.prediction, exp === 'anchoring' ? -200 : -5000, exp === 'anchoring' ? 200 : 5000)
    if (p !== null) patch.prediction = Math.round(p)
  }
  return tools.update('responses', mine.recordId, { ...patch, submitted: true })
}

/**
 * Host-only: close (reveal) or reopen a session. Closing computes the room's
 * stats server-side and stores them on the session, which is how participants
 * (who can only read their own row) get the group results for their debrief.
 * Reopening clears stats and the AI explanation so nothing stale is shown.
 */
const setPhase: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const session = await loadSession(tools, params.sessionId)
  if (!session) return fail('Session not found')
  if (session.data.hostId !== userId) return fail('Only the host can do that')
  if (params.phase === 'closed') {
    const stats = computeStats(session.data.experiment, await loadRows(tools, session.recordId))
    return tools.update('sessions', session.recordId, { phase: 'closed', stats })
  }
  if (params.phase === 'open') {
    return tools.update('sessions', session.recordId, {
      phase: 'open',
      stats: null,
      explanation: '',
      sources: [],
      explainedAt: 0,
    })
  }
  return fail('Unknown phase')
}

/**
 * Host-only: explain this room's results, grounded in fixed canonical papers.
 * Google Scholar only looks up a link for each canonical paper (accepted when
 * the title matches); Claude is told to cite only those numbered papers.
 * Owner-billed, so gated to the host, to closed sessions, and to once a minute.
 */
const explainResults: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const session = await loadSession(tools, params.sessionId)
  if (!session) return fail('Session not found')
  if (session.data.hostId !== userId) return fail('Only the host can generate the explanation')
  if (isOpen(session.data)) return fail('Close the session first')
  if (session.data.explainedAt && Date.now() - session.data.explainedAt < 60_000) {
    return fail('Please wait a minute before regenerating')
  }

  const exp = EXPERIMENTS[session.data.experiment as ExperimentId]
  // Recompute from the database rather than trusting stored or client numbers.
  const stats = computeStats(exp.id, await loadRows(tools, session.recordId))
  if (stats.n < 2) return fail('Need at least 2 submitted responses first')

  // Claim the rate-limit slot before spending credits.
  await tools.update('sessions', session.recordId, { explainedAt: Date.now() })

  // 1) Canonical sources; Scholar just finds each one's link.
  const sources: Source[] = await Promise.all(
    exp.canonical.map(async (c) => {
      const r = await tools.integration<unknown>('scholar/search-papers', { q: c.title, num: 3 })
      const hits = r.success ? ((unwrap(r.data) as { organic_results?: ScholarHit[] }).organic_results ?? []) : []
      const hit = hits.find((h) => titleMatches(String(h.title ?? ''), c.title))
      return { title: c.title, info: c.cite, link: hit ? String(hit.link ?? hit.resources?.[0]?.link ?? '') : '' }
    }),
  )

  // 2) Explanation: me/us/evidence, including how well the room predicted itself.
  const prompt = [
    `Experiment: ${exp.name}. ${exp.tagline}`,
    `What the classic effect predicts: ${exp.prediction}`,
    `This room's results (${stats.n} participants):`,
    ...stats.summary.map((l) => `- ${l}`),
    '',
    'Papers you may cite (cite as [1], [2]; never cite anything else, never invent numbers from them):',
    ...sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.info}`),
  ].join('\n')

  const llm = await tools.integration<unknown>('anthropic/chat-completion', {
    max_tokens: 700,
    temperature: 0.4,
    system:
      'You debrief a live classroom psychology demo for university students. Be casual and clear; gloss any jargon in a few words. ' +
      'Write 3 short paragraphs: (1) what happened in THIS room, quoting its numbers; ' +
      '(2) how that compares with the classic finding in the cited papers, and why the bias happens; ' +
      '(3) how well the room predicted its own result (people usually underestimate their own bias), plus one honest caveat about small, non-random classroom samples. ' +
      'Only cite the numbered papers provided. Under 230 words. Plain text, no markdown headers or bold.',
    messages: [{ role: 'user', content: prompt }],
  })
  if (!llm.success) return llm
  const explanation = extractText(unwrap(llm.data))
  if (!explanation) return fail('The AI returned an empty answer — try again in a minute')

  return tools.update('sessions', session.recordId, { explanation, sources, explainedAt: Date.now() })
}

interface ScholarHit {
  title?: string
  link?: string
  resources?: { link?: string }[]
  publication_info?: { summary?: string }
}

/** Integration responses may arrive as `{ success, data }` or as the bare body. */
function unwrap(x: unknown): unknown {
  if (x && typeof x === 'object' && 'success' in x && 'data' in x) return (x as { data: unknown }).data
  return x
}

/** Accepts Anthropic Messages shape, or a few common fallbacks. */
function extractText(x: unknown): string {
  const o = x as Record<string, unknown> | null
  if (!o) return ''
  if (typeof o.text === 'string') return o.text.trim()
  if (Array.isArray(o.content)) {
    return (o.content as { type?: string; text?: string }[])
      .filter((b) => typeof b.text === 'string')
      .map((b) => b.text)
      .join('\n')
      .trim()
  }
  const choice = (o.choices as { message?: { content?: string } }[] | undefined)?.[0]
  return choice?.message?.content?.trim() ?? ''
}

export const actions: Record<string, ActionHandler<Env>> = {
  joinSession,
  submitResponse,
  setPhase,
  explainResults,
}
