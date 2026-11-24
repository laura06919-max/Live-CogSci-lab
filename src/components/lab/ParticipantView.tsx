import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Input } from '@/components/ui'
import { callAction } from '@/lib/actions'
import {
  ANCHORS,
  EXPERIMENTS,
  STROOP_COLORS,
  STROOP_TRIALS,
  type ResponseRow,
  type Session,
} from '../../experiments'

interface Props {
  sessionId: string
  session: Session
  mine: ResponseRow | undefined
}

export default function ParticipantView({ sessionId, session, mine }: Props) {
  const exp = EXPERIMENTS[session.experiment]
  const [joinError, setJoinError] = useState<string | null>(null)
  const joining = useRef(false)

  // Join once on arrival: the server picks the condition and creates our row.
  useEffect(() => {
    if (mine || session.phase !== 'open' || joining.current) return
    joining.current = true
    callAction('joinSession', { sessionId }).then((r) => {
      if (!r.success) {
        setJoinError(r.error)
        joining.current = false
      }
    })
  }, [mine, session.phase, sessionId])

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <p className="text-sm uppercase tracking-widest text-muted-foreground">{session.title}</p>
      {mine?.submitted ? (
        <Done session={session} />
      ) : session.phase !== 'open' ? (
        <p className="mt-6 text-lg">The host has closed this session. Look at the main screen for results.</p>
      ) : joinError ? (
        <p className="mt-6 text-destructive">{joinError}</p>
      ) : !mine ? (
        <p className="mt-6 text-muted-foreground">Joining…</p>
      ) : exp.id === 'anchoring' ? (
        <Anchoring sessionId={sessionId} condition={mine.condition} />
      ) : exp.id === 'framing' ? (
        <Framing sessionId={sessionId} condition={mine.condition} />
      ) : (
        <Stroop sessionId={sessionId} />
      )}
    </div>
  )
}

function Done({ session }: { session: Session }) {
  return (
    <div data-testid="done" className="mt-6">
      <h1 className="text-2xl font-bold">Thanks — you&apos;re in!</h1>
      <p className="mt-2 text-muted-foreground">
        {session.phase === 'open'
          ? 'Watch the main screen. The host will reveal results when everyone is done.'
          : 'Results are up on the main screen.'}
      </p>
      {session.phase === 'closed' && session.explanation && (
        <div className="mt-6 whitespace-pre-wrap rounded-xl border border-border bg-card p-4 text-sm leading-relaxed">
          {session.explanation}
        </div>
      )}
    </div>
  )
}

function useSubmit(sessionId: string) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const submit = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(true)
      setErr(null)
      const r = await callAction('submitResponse', { sessionId, ...payload })
      if (!r.success) setErr(r.error)
      setBusy(false)
    },
    [sessionId],
  )
  return { busy, err, submit }
}

function Anchoring({ sessionId, condition }: { sessionId: string; condition: string }) {
  const anchor = ANCHORS[condition] ?? 9
  const [step, setStep] = useState<1 | 2>(1)
  const [age, setAge] = useState('')
  const { busy, err, submit } = useSubmit(sessionId)
  if (step === 1) {
    return (
      <div className="mt-6">
        <h1 className="text-2xl font-bold leading-snug">
          Did Mahatma Gandhi die before or after the age of {anchor}?
        </h1>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button onClick={() => setStep(2)}>Before {anchor}</Button>
          <Button onClick={() => setStep(2)}>After {anchor}</Button>
        </div>
      </div>
    )
  }
  return (
    <form
      className="mt-6"
      onSubmit={(e) => {
        e.preventDefault()
        submit({ estimate: Number(age) })
      }}
    >
      <h1 className="text-2xl font-bold leading-snug">How old do you think he was when he died?</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your best guess — no googling.</p>
      <Input
        data-testid="estimate"
        className="mt-4 h-14 text-2xl"
        type="number"
        inputMode="numeric"
        min={0}
        max={200}
        value={age}
        onChange={(e) => setAge(e.target.value)}
        autoFocus
      />
      <Button className="mt-4 w-full" type="submit" disabled={busy || age === ''}>
        {busy ? 'Sending…' : 'Submit'}
      </Button>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    </form>
  )
}

function Framing({ sessionId, condition }: { sessionId: string; condition: string }) {
  const { busy, err, submit } = useSubmit(sessionId)
  const gain = condition === 'gain'
  return (
    <div className="mt-6">
      <h1 className="text-xl font-bold leading-snug">
        A new disease is expected to kill 600 people. Two programs have been proposed. Which do you choose?
      </h1>
      <div className="mt-6 space-y-3">
        <button
          type="button"
          data-testid="choice-sure"
          disabled={busy}
          onClick={() => submit({ choice: 'sure' })}
          className="w-full rounded-xl border border-border p-4 text-left hover:bg-muted disabled:opacity-50"
        >
          <div className="font-semibold">Program A</div>
          <div className="mt-1">{gain ? '200 people will be saved.' : '400 people will die.'}</div>
        </button>
        <button
          type="button"
          data-testid="choice-risky"
          disabled={busy}
          onClick={() => submit({ choice: 'risky' })}
          className="w-full rounded-xl border border-border p-4 text-left hover:bg-muted disabled:opacity-50"
        >
          <div className="font-semibold">Program B</div>
          <div className="mt-1">
            {gain
              ? '1/3 chance all 600 are saved, 2/3 chance nobody is saved.'
              : '1/3 chance nobody dies, 2/3 chance all 600 die.'}
          </div>
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    </div>
  )
}

interface Trial {
  word: number
  ink: number
}

function makeTrials(): Trial[] {
  // Half congruent, half incongruent, shuffled.
  const t: Trial[] = []
  for (let i = 0; i < STROOP_TRIALS; i++) {
    const word = Math.floor(Math.random() * STROOP_COLORS.length)
    let ink = word
    if (i % 2 === 1) ink = (word + 1 + Math.floor(Math.random() * (STROOP_COLORS.length - 1))) % STROOP_COLORS.length
    t.push({ word, ink })
  }
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[t[i], t[j]] = [t[j], t[i]]
  }
  return t
}

function Stroop({ sessionId }: { sessionId: string }) {
  const [trials] = useState(makeTrials)
  const [i, setI] = useState(-1) // -1 = instructions
  const [blank, setBlank] = useState(false)
  const shownAt = useRef(0)
  const results = useRef<{ congruent: boolean; ms: number; correct: boolean }[]>([])
  const payload = useRef<Record<string, unknown>>({})
  const { busy, err, submit } = useSubmit(sessionId)

  useEffect(() => {
    if (i >= 0 && i < trials.length && !blank) shownAt.current = performance.now()
  }, [i, blank, trials.length])

  function answer(color: number) {
    if (blank || i < 0 || i >= trials.length) return
    const t = trials[i]
    results.current.push({ congruent: t.word === t.ink, ms: performance.now() - shownAt.current, correct: color === t.ink })
    // Short blank between trials so the next word is a fresh onset.
    setBlank(true)
    setTimeout(() => {
      setBlank(false)
      setI((n) => n + 1)
    }, 300)
  }

  useEffect(() => {
    if (i !== trials.length) return
    const rs = results.current
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
    const ok = rs.filter((r) => r.correct)
    payload.current = {
      congruentMs: avg(ok.filter((r) => r.congruent).map((r) => r.ms)),
      incongruentMs: avg(ok.filter((r) => !r.congruent).map((r) => r.ms)),
      accuracy: rs.length ? ok.length / rs.length : 0,
    }
    submit(payload.current)
  }, [i, trials.length, submit])

  if (i < 0) {
    return (
      <div className="mt-6">
        <h1 className="text-2xl font-bold">Name the INK color</h1>
        <p className="mt-2 text-muted-foreground">
          You&apos;ll see {STROOP_TRIALS} color words. Tap the button matching the color the word is <em>printed in</em>,
          not what it says. Go as fast as you can.
        </p>
        <Button data-testid="stroop-start" className="mt-6 w-full" onClick={() => setI(0)}>
          Start
        </Button>
      </div>
    )
  }
  if (i >= trials.length) {
    return (
      <div className="mt-6">
        <p className="text-lg">{busy ? 'Sending your times…' : err ? '' : 'Done!'}</p>
        {err && (
          <>
            <p className="mt-2 text-sm text-destructive">{err}</p>
            <Button className="mt-3" onClick={() => submit(payload.current)}>Retry</Button>
          </>
        )}
      </div>
    )
  }
  const t = trials[i]
  return (
    <div className="mt-6 select-none">
      <p className="text-sm text-muted-foreground">
        {i + 1} / {trials.length}
      </p>
      <div className="flex h-40 items-center justify-center">
        {!blank && (
          <span data-testid="stroop-word" className="text-6xl font-black" style={{ color: STROOP_COLORS[t.ink].css }}>
            {STROOP_COLORS[t.word].name}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {STROOP_COLORS.map((c, idx) => (
          <button
            key={c.name}
            type="button"
            data-testid={`stroop-${c.name}`}
            onPointerDown={() => answer(idx)}
            className="h-16 rounded-xl border-2 border-border text-lg font-semibold text-foreground active:scale-95"
          >
            {c.name.toLowerCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
