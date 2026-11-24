/**
 * My Lab: a student's personal lab notebook.
 *
 * No extra collection is needed. The server already sends a student only
 * their own `responses` rows (read: 'shared'), and each revealed session
 * carries the class stats. Joining the two gives a private history:
 * one card per completed experiment, grouped by area of cognitive science.
 * It's a learning history, not a profile: no scores, ranks or comparisons
 * with other individuals.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useQuery } from 'deepspace'
import {
  AREAS,
  EXPERIMENTS,
  personalLines,
  type Area,
  type ResponseRow,
  type Session,
} from '../../../experiments'

export default function NotebookPage() {
  const { userId } = useAuth()
  const responses = useQuery<ResponseRow>('responses', { where: { userId: userId ?? '__none__' } })
  const sessions = useQuery<Session>('sessions')
  const [area, setArea] = useState<Area | 'all'>('all')

  const entries = useMemo(() => {
    const byId = new Map(sessions.records.map((s) => [s.recordId, s]))
    return responses.records
      .filter((r) => r.data.submitted)
      .map((r) => ({ response: r, session: byId.get(r.data.sessionId) }))
      .filter((e): e is { response: typeof e.response; session: NonNullable<typeof e.session> } => !!e.session)
      .sort((a, b) => time(b.response.updatedAt) - time(a.response.updatedAt))
  }, [responses.records, sessions.records])

  const counts = Object.fromEntries(
    AREAS.map((a) => [a, entries.filter((e) => EXPERIMENTS[e.session.data.experiment].area === a).length]),
  ) as Record<Area, number>
  const shown = area === 'all' ? entries : entries.filter((e) => EXPERIMENTS[e.session.data.experiment].area === area)
  const loading = responses.status === 'loading' || sessions.status === 'loading'

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">My Lab</h1>
      <p className="mt-2 text-muted-foreground">
        Every experiment you&apos;ve taken part in, what happened, and what it shows. Only you can see your answers.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Chip active={area === 'all'} onClick={() => setArea('all')}>
          <span data-testid="notebook-total">{entries.length}</span> completed
        </Chip>
        {AREAS.map((a) => (
          <Chip key={a} active={area === a} onClick={() => setArea(a)}>
            {a} · {counts[a]}
          </Chip>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          {entries.length === 0 ? (
            <>
              No experiments yet. When your instructor shows a QR code, scan it, or{' '}
              <Link to="/join" className="underline">enter a code</Link>.
            </>
          ) : (
            'Nothing in this area yet.'
          )}
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {shown.map(({ response, session }) => {
            const exp = EXPERIMENTS[session.data.experiment]
            const revealed = session.data.phase === 'closed' && !!session.data.stats
            const lines = revealed ? personalLines(session.data, response.data) : null
            const when = time(response.updatedAt) ? new Date(time(response.updatedAt)).toLocaleDateString() : ''
            return (
              <li key={response.recordId} data-testid="notebook-entry" className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">{exp.name} effect</h2>
                  <span className="text-xs text-muted-foreground">
                    {exp.area} · {session.data.title} · {when}
                  </span>
                </div>
                {lines ? (
                  <dl className="mt-3 space-y-2 text-sm">
                    <Item k="Me" v={lines.me} />
                    <Item k="My class" v={lines.us} />
                    <Item k="Research" v={exp.research} />
                    <Item k="Takeaway" v={exp.takeaway} />
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Waiting for the instructor to reveal results. Your condition stays hidden until then.
                  </p>
                )}
                <Link to={`/lab/${session.recordId}`} className="mt-3 inline-block text-sm underline">
                  {session.data.explanation ? 'Open full debrief and sources' : 'Open session'}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Envelope timestamps may arrive as Date, ISO string or epoch ms. */
function time(v: unknown): number {
  const t = v == null ? NaN : new Date(v as string).getTime()
  return Number.isNaN(t) ? 0 : t
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm ${active ? 'border-primary bg-primary/15' : 'border-border hover:bg-muted'}`}
    >
      {children}
    </button>
  )
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  )
}
