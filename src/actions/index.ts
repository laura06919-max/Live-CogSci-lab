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
  summarize,
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

/** Join a session: assign a random condition server-side (idempotent). */
const joinSession: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const session = await loadSession(tools, params.sessionId)
  if (!session) return fail('Session not found')
  const existing = await findMyResponse(tools, session.recordId, userId)
  if (existing) return { success: true, data: { responseId: existing.recordId } }
  if (session.data.phase !== 'open') return fail('This session is closed')

  const conds = EXPERIMENTS[session.data.experiment].conditions
  // Balanced-ish random assignment: put the newcomer in the smaller group,
  // breaking ties randomly. Small classes otherwise end up lopsided.
  let condition = 'within'
  if (conds.length) {
    const all = await tools.query('responses', { where: { sessionId: session.recordId }, limit: 1000 })
    const rows = all.success ? (all.data as unknown as { records: Envelope<ResponseRow>[] }).records : []
    const counts = conds.map((c) => rows.filter((r) => r.data.condition === c).length)
    const min = Math.min(...counts)
    const candidates = conds.filter((_, i) => counts[i] === min)
    condition = candidates[Math.floor(Math.random() * candidates.length)]
  }

  const created = await tools.create('responses', {
    sessionId: session.recordId,
    userId,
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
  if (session.data.phase !== 'open') return fail('The host has closed this session')
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
  return tools.update('responses', mine.recordId, { ...patch, submitted: true })
}

/**
 * Host-only: look up real papers (Google Scholar), then ask Claude to explain
 * this room's results citing only those papers. Owner-billed, so it is gated to
 * the session host and rate-limited per session.
 */
const explainResults: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const session = await loadSession(tools, params.sessionId)
  if (!session) return fail('Session not found')
  if (session.data.hostId !== userId) return fail('Only the host can generate the explanation')
  if (session.data.explainedAt && Date.now() - session.data.explainedAt < 60_000) {
    return fail('Please wait a minute before regenerating')
  }

  const all = await tools.query('responses', { where: { sessionId: session.recordId }, limit: 1000 })
  if (!all.success) return all
  const rows = (all.data as unknown as { records: Envelope<ResponseRow>[] }).records.map((r) => r.data)
  const exp = EXPERIMENTS[session.data.experiment as ExperimentId]
  const stats = summarize(exp.id, rows)
  if (stats.n < 2) return fail('Need at least 2 submitted responses first')

  // Claim the rate-limit slot before spending credits.
  await tools.update('sessions', session.recordId, { explainedAt: Date.now() })

  // 1) Ground truth: real papers from Google Scholar.
  let sources: Source[] = []
  const scholar = await tools.integration<unknown>('scholar/search-papers', { q: exp.scholarQuery, num: 5 })
  if (scholar.success) {
    const body = unwrap(scholar.data) as { organic_results?: ScholarHit[] }
    sources = (body.organic_results ?? []).slice(0, 4).map((h) => ({
      title: String(h.title ?? 'Untitled'),
      link: String(h.link ?? h.resources?.[0]?.link ?? ''),
      info: String(h.publication_info?.summary ?? ''),
    }))
  }

  // 2) Explanation grounded in those papers.
  const sourceList = sources.length
    ? sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.info}`).join('\n')
    : '(no sources found — do not cite any papers)'
  const prompt = [
    `Experiment: ${exp.name}. ${exp.tagline}`,
    `What the classic effect predicts: ${exp.prediction}`,
    `This room's results (${stats.n} participants):`,
    ...stats.lines.map((l) => `- ${l}`),
    '',
    'Papers you may cite (cite as [1], [2]; never cite anything else):',
    sourceList,
  ].join('\n')

  const llm = await tools.integration<unknown>('anthropic/chat-completion', {
    max_tokens: 700,
    temperature: 0.4,
    system:
      'You explain live classroom psychology demos to university students. Be casual and clear, no jargon without a one-line gloss. ' +
      'In 3 short paragraphs: (1) what happened in THIS room, quoting the numbers; (2) whether it matches the classic finding and why the bias happens; ' +
      '(3) one honest caveat about small, non-random classroom samples. Only cite the numbered papers provided. Under 220 words. Plain text, no markdown headers.',
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
  explainResults,
}
