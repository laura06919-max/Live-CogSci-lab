/**
 * Landing page — static (no providers), prerendered for crawlers.
 */
import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { seo } from '../seo'

const STEPS = [
  { n: '1', t: 'Host picks an effect', d: 'Anchoring, framing or Stroop. You get a 5-letter code for the projector.' },
  { n: '2', t: 'The room joins on phones', d: 'The server secretly splits people into conditions. Nobody knows which group they are in.' },
  { n: '3', t: 'Predict, then reveal', d: 'Everyone guesses how big the effect will be. Then the room sees its real result, live.' },
  { n: '4', t: 'Your personal mirror', d: 'Every phone shows me → us → research, plus an AI debrief that may cite only the classic papers.' },
]

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="min-h-screen bg-background text-foreground">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <span className="font-semibold tracking-tight">Bias Mirror <span className="font-normal text-muted-foreground">· Live CogSci Lab</span></span>
          <Link to="/join" className="text-sm underline-offset-4 hover:underline">
            I have a code
          </Link>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-20 pt-10">
          <p className="font-mono text-sm text-muted-foreground">me → us → the research</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            See your decision, your room, and the research side by side.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Run anchoring, framing or Stroop with everyone in the room. Each person predicts the effect, then at the
            reveal their phone shows what they did, what the room did, and what the published studies found.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/host"
              className="inline-flex items-center rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90"
            >
              Host a session
            </Link>
            <Link to="/join" className="inline-flex items-center rounded-full border border-border px-6 py-3 font-medium hover:bg-muted">
              Join with a code
            </Link>
          </div>
          <ol className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl border border-border p-5">
                <span className="font-mono text-sm text-muted-foreground">{s.n}</span>
                <h2 className="mt-2 font-semibold">{s.t}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 text-xs text-muted-foreground">
            Classroom demos are teaching tools, not research: samples are small and not random.
          </p>
        </main>
      </div>
    </>
  )
}
