/**
 * Host dashboard: start a new live experiment and see sessions you've run.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth, useMutations, useQuery } from 'deepspace'
import { Button, Input, useToast } from '@/components/ui'
import { EXPERIMENTS, makeCode, type ExperimentId, type Session } from '../../../experiments'

export default function HostPage() {
  const { userId: authUserId } = useAuth()
  const userId = authUserId ?? ''
  const navigate = useNavigate()
  const { error } = useToast()
  const { ready, createConfirmed } = useMutations<Session>('sessions')
  const { records, status } = useQuery<Session>('sessions', {
    where: { hostId: userId },
    orderBy: 'createdAt',
    orderDir: 'desc',
  })
  const [experiment, setExperiment] = useState<ExperimentId>('anchoring')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  async function start() {
    setBusy(true)
    try {
      // Retry on the (unlikely) code collision; uniqueOn rejects duplicates server-side.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const id = await createConfirmed({
            code: makeCode(),
            hostId: userId,
            title: title.trim() || `${EXPERIMENTS[experiment].name} demo`,
            experiment,
            phase: 'open',
          })
          navigate(`/lab/${id}`)
          return
        } catch (e) {
          if (attempt === 2) throw e
        }
      }
    } catch (e) {
      error('Could not start session', e instanceof Error ? e.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Run a live experiment</h1>
      <p className="mt-2 text-muted-foreground">
        Pick a classic effect. Your room joins with a 5-letter code, the server randomly assigns
        conditions, and results build up live on your screen.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {Object.values(EXPERIMENTS).map((e) => (
          <button
            key={e.id}
            type="button"
            data-testid={`pick-${e.id}`}
            onClick={() => setExperiment(e.id)}
            className={`rounded-xl border p-4 text-left transition ${
              experiment === e.id ? 'border-primary bg-primary/10 ring-2 ring-primary' : 'border-border hover:bg-muted'
            }`}
          >
            <div className="font-semibold">{e.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">{e.tagline}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              {e.conditions.length ? 'Between-subjects · 2 groups' : 'Within-subjects · ~40 s'}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Session title (optional), e.g. COGS 1 — Section B"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button data-testid="start-session" disabled={!ready || busy || !userId} onClick={start}>
          {busy ? 'Starting…' : 'Start session'}
        </Button>
      </div>

      <h2 className="mt-12 text-lg font-semibold">Your sessions</h2>
      {status === 'loading' ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
      ) : records.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">None yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {records.map((r) => (
            <li key={r.recordId}>
              <Link to={`/lab/${r.recordId}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted">
                <span>
                  <span className="font-medium">{r.data.title}</span>
                  <span className="ml-2 text-sm text-muted-foreground">{EXPERIMENTS[r.data.experiment]?.name}</span>
                </span>
                <span className="font-mono text-sm">
                  {r.data.code} · {r.data.phase === 'open' ? 'open' : 'closed'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
