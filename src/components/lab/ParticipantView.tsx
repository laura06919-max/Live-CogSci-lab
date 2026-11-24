import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Button, Input } from '@/components/ui'
import { callAction } from '@/lib/actions'
import {
  ANCHORS,
  EXPERIMENTS,
  STROOP_COLORS,
  STROOP_TRIALS,
  personalLines,
  type ResponseRow,
  type Session,
} from '../../experiments'
import { Explanation, PredictedVsActual, WhyItMatters } from './Compare'

interface Props {
  sessionId: string
  session: Session
  mine: ResponseRow | undefined
}

type Payload = Record<string, unknown>
/** Tasks hand their answer up; the parent asks for a prediction, then submits both. */
const AnswerCtx = createContext<(p: Payload) => void>(() => {})

export default function ParticipantView({ sessionId, session, mine }: Props) {
  const exp = EXPERIMENTS[session.experiment]
  const open = session.phase !== 'closed'
  const [joinError, setJoinError] = useState<string | null>(null)
  const [answer, setAnswer] = useState<Payload | null>(null)
  const joining = useRef(false)

  // Join once on arrival: the server picks the condition and creates our row.
  useEffect(() => {
    if (mine || !open || joining.current) return
    joining.current = true
    callAction('joinSession', { sessionId }).then((r) => {
      if (!r.success) {
        setJoinError(r.error)
        joining.current = false
      }
    })
  }, [mine, open, sessionId])

  let body
  if (mine?.submitted) body = <Debrief session={session} mine={mine} />
  else if (!open) body = <p className="mt-6 text-lg">The host has closed this session. Look at the main screen for results.</p>
  else if (joinError) body = <p className="mt-6 text-destructive">{joinError}</p>
  else if (!mine) body = <p className="mt-6 text-muted-foreground">Joining…</p>
  else if (answer) body = <Predict sessionId={sessionId} session={session} answer={answer} />
  else if (exp.id === 'anchoring') body = <Anchoring sessionId={sessionId} condition={mine.condition} />
  else if (exp.id === 'framing') body = <Framing sessionId={sessionId} condition={mine.condition} />
  else body = <Stroop sessionId={sessionId} />

  return (
    <AnswerCtx.Provider value={setAnswer}>
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          {open ? exp.neutralLabel : `${exp.name} effect · ${session.title}`}
        </p>
        {body}
      </div>
    </AnswerCtx.Provider>
  )
}

/** Step 2: before anyone sees results, predict the size of the room's effect. */
function Predict({ sessionId, session, answer }: { sessionId: string; session: Session; answer: Payload }) {
  const exp = EXPERIMENTS[session.experiment]
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function send(extra: Payload) {
    setBusy(true)
    setErr(null)
    const r = await callAction('submitResponse', { sessionId, ...answer, ...extra })
    if (!r.success) setErr(r.error)
    setBusy(false)
  }

  return (
    <div data-testid="predict" className="mt-6">
      <p className="text-sm text-muted-foreground">Answer saved locally. One last question before you send it:</p>
      <h1 className="mt-2 text-xl font-bold leading-snug">{exp.predictQuestion}</h1>
      {exp.id === 'framing' ? (
        <div className="mt-5 grid gap-3">
          {[
            ['gain', 'When it says "people will be saved"'],
            ['loss', 'When it says "people will die"'],
            ['same', 'No difference, it\'s the same choice'],
          ].map(([k, label]) => (
            <Button key={k} variant="outline" className="h-auto min-h-12 whitespace-normal py-3" disabled={busy} data-testid={`predict-${k}`} onClick={() => send({ predictedFrame: k })}>
              {label}
            </Button>
          ))}
        </div>
      ) : (
        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault()
            send({ prediction: Number(value) })
          }}
        >
          <div className="flex items-center gap-3">
            <Input
              data-testid="prediction"
              className="h-14 text-2xl"
              type="number"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
            <span className="text-muted-foreground">{exp.id === 'anchoring' ? 'years' : 'ms'}</span>
          </div>
          <Button className="mt-4 h-12 w-full text-base" type="submit" disabled={busy || value === ''}>
            {busy ? 'Sending…' : 'Send my answer'}
          </Button>
        </form>
      )}
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    </div>
  )
}

/** Personal debrief: me → us → evidence. Uses only my own row plus the room stats the server published at reveal. */
function Debrief({ session, mine }: { session: Session; mine: ResponseRow }) {
  const exp = EXPERIMENTS[session.experiment]
  const stats = session.stats
  if (session.phase !== 'closed' || !stats) {
    return (
      <div data-testid="done" className="mt-6">
        <div className="mb-4 h-2 w-24 animate-pulse rounded-full bg-primary/60" aria-hidden />
        <h1 className="font-display text-2xl font-bold">Sent. Now wait for the reveal.</h1>
        <p className="mt-2 text-muted-foreground">
          When the host reveals the results, this screen will show your answer, the room&apos;s result and the research side by side.
        </p>
      </div>
    )
  }
  const f = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(0))
  const { me, us } = personalLines(session, mine)

  return (
    <div data-testid="debrief" className="mt-6 space-y-5">
      <h1 className="font-display text-2xl font-bold">Your results</h1>
      <div className="space-y-3">
        <Row k="Me" v={me} />
        <Row k="Us" v={us} />
        {typeof mine.prediction === 'number' && (
          <Row
            k="You predicted"
            v={`${mine.prediction} ${exp.id === 'anchoring' ? 'years' : 'ms'}. The room's actual effect was ${f(stats.effect)}.`}
          />
        )}
        {mine.predictedFrame && (
          <Row
            k="You predicted"
            v={mine.predictedFrame === 'same' ? 'No difference between wordings.' : `The "${mine.predictedFrame === 'gain' ? 'saved' : 'die'}" wording would get more sure picks.`}
          />
        )}
      </div>
      <Row k="Takeaway" v={exp.takeaway} />
      <PredictedVsActual experiment={session.experiment} stats={stats} />
      <p className="text-xs text-muted-foreground">
        A classroom demonstration, not a cognitive assessment: one session, a few trials, phone timing.
      </p>
      <WhyItMatters experiment={session.experiment} />
      {session.explanation ? (
        <Explanation text={session.explanation} sources={session.sources} />
      ) : (
        <p className="text-sm text-muted-foreground">The host can add an explanation with sources. It will appear here.</p>
      )}
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className="mt-1 text-lg leading-snug">{v}</div>
    </div>
  )
}

/** Task components report their answer to the parent (which then asks for a prediction). */
function useSubmit(_sessionId: string) {
  const onAnswer = useContext(AnswerCtx)
  const submit = useCallback(async (payload: Payload) => onAnswer(payload), [onAnswer])
  return { busy: false, err: null as string | null, submit }
}

function Anchoring({ sessionId, condition }: { sessionId: string; condition: string }) {
  const anchor = ANCHORS[condition] ?? 9
  const [step, setStep] = useState<1 | 2>(1)
  const [age, setAge] = useState('')
  const { busy, err, submit } = useSubmit(sessionId)
  if (step === 1) {
    return (
      <div className="mt-6">
        <h1 className="font-display text-2xl font-bold leading-snug">
          Did Mahatma Gandhi die before or after the age of {anchor}?
        </h1>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button className="h-14 text-lg" onClick={() => setStep(2)}>Before {anchor}</Button>
          <Button className="h-14 text-lg" onClick={() => setStep(2)}>After {anchor}</Button>
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
      <h1 className="font-display text-2xl font-bold leading-snug">How old do you think he was when he died?</h1>
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
      <Button className="mt-4 h-12 w-full text-base" type="submit" disabled={busy || age === ''}>
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
      <h1 className="font-display text-xl font-bold leading-snug">
        A new disease is expected to kill 600 people. Two programs have been proposed. Which do you choose?
      </h1>
      <div className="mt-6 space-y-3">
        <button
          type="button"
          data-testid="choice-sure"
          disabled={busy}
          onClick={() => submit({ choice: 'sure' })}
          className="w-full rounded-xl border-2 border-border bg-card p-4 text-left hover:border-primary disabled:opacity-50"
        >
          <div className="font-semibold">Program A</div>
          <div className="mt-1">{gain ? '200 people will be saved.' : '400 people will die.'}</div>
        </button>
        <button
          type="button"
          data-testid="choice-risky"
          disabled={busy}
          onClick={() => submit({ choice: 'risky' })}
          className="w-full rounded-xl border-2 border-border bg-card p-4 text-left hover:border-primary disabled:opacity-50"
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
        <h1 className="font-display text-2xl font-bold">Name the INK color</h1>
        <p className="mt-2 text-muted-foreground">
          You&apos;ll see {STROOP_TRIALS} color words. Tap the button matching the color the word is <em>printed in</em>,
          not what it says. Go as fast as you can.
        </p>
        <Button data-testid="stroop-start" className="mt-6 h-12 w-full text-base" onClick={() => setI(0)}>
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
