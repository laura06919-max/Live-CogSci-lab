import { useState } from 'react'
import { Button, useToast } from '@/components/ui'
import { callAction } from '@/lib/actions'
import { ANCHORS, EXPERIMENTS, computeStats, mean, median, type ResponseRow, type Session } from '../../experiments'
import Qr from './Qr'
import { Explanation, PredictedVsActual } from './Compare'

interface Props {
  sessionId: string
  session: Session
  rows: ResponseRow[]
}

export default function HostView({ sessionId, session, rows }: Props) {
  const exp = EXPERIMENTS[session.experiment]
  const { error } = useToast()
  const [explaining, setExplaining] = useState(false)
  const [switching, setSwitching] = useState(false)
  const open = session.phase !== 'closed'
  const joined = rows.length
  const done = rows.filter((r) => r.submitted)
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join?code=${session.code}` : ''

  async function explain() {
    setExplaining(true)
    const r = await callAction('explainResults', { sessionId })
    setExplaining(false)
    if (!r.success) error('Could not explain results', r.error)
  }

  async function togglePhase() {
    if (!open && session.explanation && !window.confirm('Reopening clears the current results and AI explanation. Continue?')) return
    setSwitching(true)
    const r = await callAction('setPhase', { sessionId, phase: open ? 'closed' : 'open' })
    setSwitching(false)
    if (!r.success) error('Could not update session', r.error)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">{exp.name} · {session.title}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{exp.tagline}</h1>
          <p className="mt-2 text-muted-foreground">
            <span data-testid="joined-count" className="font-semibold text-foreground">{joined}</span> joined ·{' '}
            <span data-testid="submitted-count" className="font-semibold text-foreground">{done.length}</span> answered
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4">
          <Qr value={joinUrl} size={120} />
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Scan, or go to {window.location.host}/join</div>
            <div data-testid="session-code" className="mt-1 font-mono text-5xl font-bold tracking-[0.25em]">
              {session.code}
            </div>
            <button
              type="button"
              className="mt-1 text-xs text-muted-foreground underline"
              onClick={() => navigator.clipboard?.writeText(joinUrl)}
            >
              copy join link
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button data-testid="toggle-phase" variant={open ? 'default' : 'outline'} disabled={switching} onClick={togglePhase}>
          {switching ? '…' : open ? 'Close & reveal results' : 'Reopen for answers'}
        </Button>
        {!open && (
          <Button data-testid="explain" variant="outline" disabled={explaining || done.length < 2} onClick={explain}>
            {explaining ? 'Finding papers & writing…' : session.explanation ? 'Regenerate explanation' : 'Explain these results'}
          </Button>
        )}
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        {open ? (
          <div>
            <p className="text-sm text-muted-foreground">
              Results are hidden while people answer (so nobody is influenced). Live progress:
            </p>
            <ConditionProgress session={session} rows={rows} />
          </div>
        ) : (
          <Results session={session} rows={done} />
        )}
      </section>

      {!open && done.length > 0 && (
        <section className="mt-6">
          <PredictedVsActual experiment={session.experiment} stats={session.stats ?? computeStats(session.experiment, rows)} />
        </section>
      )}

      {!open && session.explanation && (
        <div className="mt-6">
          <Explanation text={session.explanation} sources={session.sources} />
        </div>
      )}
    </div>
  )
}

function ConditionProgress({ session, rows }: { session: Session; rows: ResponseRow[] }) {
  const exp = EXPERIMENTS[session.experiment]
  const groups = exp.conditions.length ? exp.conditions : ['within']
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {groups.map((c) => {
        const inGroup = rows.filter((r) => r.condition === c)
        return (
          <div key={c} className="rounded-xl bg-muted p-4">
            <div className="text-sm text-muted-foreground">{exp.conditionLabels[c] ?? 'Everyone'}</div>
            <div className="mt-1 text-2xl font-semibold">
              {inGroup.filter((r) => r.submitted).length}
              <span className="text-base font-normal text-muted-foreground"> / {inGroup.length} answered</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Horizontal bar, scaled to `max`. */
function Bar({ label, value, max, display, tone }: { label: string; value: number; max: number; display: string; tone: string }) {
  const pct = max > 0 ? Math.max(2, (100 * value) / max) : 0
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono font-semibold">{display}</span>
      </div>
      <div className="mt-1 h-8 overflow-hidden rounded-lg bg-muted">
        <div className={`h-full rounded-lg transition-all duration-700 ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Results({ session, rows }: { session: Session; rows: ResponseRow[] }) {
  const exp = EXPERIMENTS[session.experiment]
  if (rows.length === 0) return <p className="text-muted-foreground">No answers yet.</p>

  if (exp.id === 'anchoring') {
    const byC = ['low', 'high'].map((c) => {
      const xs = rows.filter((r) => r.condition === c && typeof r.estimate === 'number').map((r) => r.estimate!)
      return { c, xs, mean: mean(xs), median: median(xs) }
    })
    const max = Math.max(...byC.flatMap((g) => g.xs), 1)
    return (
      <div data-testid="results">
        <h2 className="text-lg font-semibold">How old was Gandhi when he died? (actual: 78)</h2>
        <p className="text-sm text-muted-foreground">{exp.prediction}</p>
        <div className="mt-5 space-y-6">
          {byC.map((g) => (
            <div key={g.c}>
              <Bar
                label={`${exp.conditionLabels[g.c]} (n=${g.xs.length})`}
                value={g.mean ?? 0}
                max={Math.max(max, 140)}
                display={g.mean === null ? '—' : `mean ${g.mean.toFixed(0)} · median ${g.median!.toFixed(0)}`}
                tone={g.c === 'low' ? 'bg-sky-500' : 'bg-orange-500'}
              />
              {/* Dot strip: every individual answer, so outliers are visible. */}
              <div className="relative mt-2 h-4">
                {g.xs.map((x, i) => (
                  <span
                    key={i}
                    className={`absolute top-1 h-2.5 w-2.5 -translate-x-1/2 rounded-full opacity-70 ${g.c === 'low' ? 'bg-sky-500' : 'bg-orange-500'}`}
                    style={{ left: `${(100 * x) / Math.max(max, 140)}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        {byC[0].mean !== null && byC[1].mean !== null && (
          <p className="mt-6 text-xl">
            Anchor gap: <strong>{(byC[1].mean - byC[0].mean).toFixed(0)} years</strong> between groups.
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">Ages {ANCHORS.low} and {ANCHORS.high} are both impossible — and still pull answers.</p>
      </div>
    )
  }

  if (exp.id === 'framing') {
    const byC = ['gain', 'loss'].map((c) => {
      const rs = rows.filter((r) => r.condition === c && r.choice)
      const sure = rs.filter((r) => r.choice === 'sure').length
      return { c, n: rs.length, sure, pct: rs.length ? (100 * sure) / rs.length : 0 }
    })
    return (
      <div data-testid="results">
        <h2 className="text-lg font-semibold">Who picked the sure option (Program A)?</h2>
        <p className="text-sm text-muted-foreground">{exp.prediction} Both programs have the same expected outcome.</p>
        <div className="mt-5 space-y-5">
          {byC.map((g) => (
            <Bar
              key={g.c}
              label={`${exp.conditionLabels[g.c]} (n=${g.n})`}
              value={g.pct}
              max={100}
              display={g.n ? `${g.pct.toFixed(0)}% sure (${g.sure}/${g.n})` : '—'}
              tone={g.c === 'gain' ? 'bg-emerald-500' : 'bg-rose-500'}
            />
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Classic result (Tversky &amp; Kahneman, 1981): ~72% sure in the gain frame vs ~22% in the loss frame.</p>
      </div>
    )
  }

  const rs = rows.filter((r) => typeof r.congruentMs === 'number' && typeof r.incongruentMs === 'number')
  const con = mean(rs.map((r) => r.congruentMs!)) ?? 0
  const inc = mean(rs.map((r) => r.incongruentMs!)) ?? 0
  const max = Math.max(con, inc, 1)
  const slower = rs.filter((r) => r.incongruentMs! > r.congruentMs!).length
  return (
    <div data-testid="results">
      <h2 className="text-lg font-semibold">Average reaction time (correct trials)</h2>
      <p className="text-sm text-muted-foreground">{exp.prediction}</p>
      <div className="mt-5 space-y-5">
        <Bar label="Congruent (RED in red)" value={con} max={max} display={`${con.toFixed(0)} ms`} tone="bg-emerald-500" />
        <Bar label="Incongruent (RED in blue)" value={inc} max={max} display={`${inc.toFixed(0)} ms`} tone="bg-rose-500" />
      </div>
      <p className="mt-6 text-xl">
        Interference: <strong>{(inc - con).toFixed(0)} ms</strong> · {slower}/{rs.length} people were slower on mismatched words.
      </p>
    </div>
  )
}
