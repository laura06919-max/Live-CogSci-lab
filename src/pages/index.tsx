/**
 * Landing page — static (no providers), prerendered for crawlers.
 */
import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { seo } from '../seo'

const STEPS = [
  { n: '1', t: 'Host picks an effect', d: 'Anchoring, framing or Stroop. You get a 5-letter code for the projector.' },
  { n: '2', t: 'The room joins on phones', d: 'The server secretly splits people into conditions. Nobody knows which group they are in.' },
  { n: '3', t: 'Reveal, live', d: 'Close the session and the room sees its own bias, charted from its own answers.' },
  { n: '4', t: 'Explain, with sources', d: 'Google Scholar finds the original papers; Claude explains your numbers citing only those.' },
]

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="min-h-screen bg-background text-foreground">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <span className="font-semibold tracking-tight">Live CogSci Lab</span>
          <Link to="/join" className="text-sm underline-offset-4 hover:underline">
            I have a code
          </Link>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-20 pt-10">
          <p className="font-mono text-sm text-muted-foreground">anchoring · framing · stroop</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Don&apos;t lecture about cognitive bias. Make the room show it.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Run a classic psychology experiment with everyone in the room in under two minutes. Answers sync live,
            conditions are randomized on the server, and the explanation cites real papers.
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
