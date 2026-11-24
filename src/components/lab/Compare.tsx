import { EXPERIMENTS, type ExperimentId, type RoomStats, type Source } from '../../experiments'

/** "We predicted → we got → research found", shared by host and participant screens. */
export function PredictedVsActual({ experiment, stats }: { experiment: ExperimentId; stats: RoomStats }) {
  const exp = EXPERIMENTS[experiment]
  const fmt = (v: number | null | undefined, unit: string) => (v == null ? '—' : `${v.toFixed(0)} ${unit}`)
  let predicted: string
  let actual: string
  if (experiment === 'framing') {
    const v = stats.predictedVotes ?? {}
    const total = (v.gain ?? 0) + (v.loss ?? 0) + (v.same ?? 0)
    predicted = total
      ? `${v.gain ?? 0} of ${total} said "lives saved" wording would get more sure picks`
      : '—'
    actual =
      stats.effect == null
        ? '—'
        : stats.effect > 0
          ? `"Lives saved" got ${stats.effect.toFixed(0)} pts more sure picks`
          : stats.effect < 0
            ? `"Lives lost" got ${(-stats.effect).toFixed(0)} pts more sure picks`
            : 'No difference'
  } else {
    const unit = experiment === 'anchoring' ? 'years' : 'ms'
    predicted = `${fmt(stats.predicted, unit)} gap`
    actual = `${fmt(stats.effect, unit)} gap`
  }
  return (
    <div data-testid="three-way" className="grid gap-3 sm:grid-cols-3">
      <Cell label="We predicted" value={predicted} />
      <Cell label="What happened" value={actual} strong />
      <Cell label="What research found" value={exp.research} small />
    </div>
  )
}

function Cell({ label, value, strong, small }: { label: string; value: string; strong?: boolean; small?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${strong ? 'bg-primary/15 ring-1 ring-primary' : 'bg-muted'}`}>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 ${small ? 'text-sm' : 'text-xl font-semibold'}`}>{value}</div>
    </div>
  )
}

export function Explanation({ text, sources }: { text: string; sources?: Source[] }) {
  return (
    <section data-testid="explanation" className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">What just happened</h2>
      <div className="mt-3 whitespace-pre-wrap leading-relaxed">{text}</div>
      {sources && sources.length > 0 && (
        <ol className="mt-4 space-y-1 text-sm text-muted-foreground">
          {sources.map((s, i) => (
            <li key={i}>
              [{i + 1}]{' '}
              {s.link ? (
                <a className="underline" href={s.link} target="_blank" rel="noreferrer">
                  {s.title}
                </a>
              ) : (
                s.title
              )}{' '}
              — {s.info}
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Written by Claude from this room&apos;s numbers. It may cite only the papers listed, which were chosen in advance;
        links were looked up on Google Scholar.
      </p>
    </section>
  )
}
