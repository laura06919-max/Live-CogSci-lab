/**
 * Discover — the public experiment library (static, no sign-in, prerendered).
 *
 * Shows what each experiment is and how it's designed, so students and
 * instructors can browse without an account. What the effect *is* sits behind
 * an "instructors" spoiler: a student who reads it first would be primed and
 * change the result when they later take part.
 */
import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { seo } from '../seo'
import { EXPERIMENTS } from '../experiments'

export default function Discover() {
  return (
    <>
      <Seo
        {...seo}
        title="Discover experiments | Bias Mirror"
        description="Browse classic cognitive-science experiments you can run live with a class: anchoring, framing and Stroop."
        path="/discover"
      />
      <div className="min-h-screen bg-background text-foreground">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <Link to="/" className="font-display text-lg font-bold">
            Bias Mirror
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/join" className="hover:underline">Join with a code</Link>
            <Link to="/notebook" className="hover:underline">My Lab</Link>
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-20 pt-6">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">Experiment library</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Classic, well-replicated studies that work in a lecture hall in about a minute. Host one with your class,
            or join when your instructor shows a code.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Taking part soon? Skip the instructor notes. Knowing what an experiment tests changes how you answer.
            The full explanation unlocks in your debrief after the reveal.
          </p>

          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {Object.values(EXPERIMENTS).map((e) => (
              <li key={e.id} data-testid={`discover-${e.id}`} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="text-xs uppercase tracking-widest text-primary">{e.area}</div>
                <h2 className="mt-2 font-display text-2xl font-bold">{e.name}</h2>
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-full bg-muted px-2.5 py-1">
                    {e.conditions.length ? 'Between-subjects' : 'Within-subjects'}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1">{e.minutes}</span>
                  <span className="rounded-full bg-muted px-2.5 py-1">Phone-friendly</span>
                </div>
                <p className="mt-3 text-sm">
                  <span className="text-muted-foreground">Participants: </span>
                  {e.task}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  After the reveal: a personal debrief, class results vs. published research, {e.why.concepts.length} course
                  concepts, real-life examples and a reflection question.
                </p>

                <details className="mt-4 rounded-xl bg-muted p-3 text-sm">
                  <summary className="cursor-pointer font-medium">For instructors (spoiler)</summary>
                  <p className="mt-2">{e.prediction}</p>
                  <p className="mt-2 text-muted-foreground">{e.why.method}</p>
                  <p className="mt-2">
                    <span className="text-muted-foreground">Concepts: </span>
                    {e.why.concepts.join(' · ')}
                  </p>
                  <p className="mt-2">
                    <span className="text-muted-foreground">Sources: </span>
                    {e.canonical.map((c) => c.cite).join('; ')}
                  </p>
                </details>

                <div className="mt-auto pt-5">
                  <Link
                    to="/host"
                    className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Host with my class
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          <section className="mt-14 rounded-2xl border border-dashed border-border p-6">
            <h2 className="font-display text-xl font-bold">Coming next: classroom replications</h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Hosts will be able to publish an anonymous summary of a session: aggregates only, at least 10 participants,
              opt-in. Each experiment will show how different classes compared with each other and with the published
              research.
            </p>
          </section>
        </main>
      </div>
    </>
  )
}
