/**
 * Classroom-event pieces: the projector lobby wall and the reveal countdown.
 * Patterns borrowed from live-quiz tools (people popping in, a moment of
 * suspense before the reveal) with this app's own look, no points or ranking.
 */
import { useEffect, useRef, useState } from 'react'
import { useUserLookup } from 'deepspace'
import type { ResponseRow } from '../../experiments'

/**
 * Names of people who joined, popping in as they arrive. First names only:
 * this is on a projector, and the wall shows who is here, never what anyone
 * answered. A filled chip just means "answered".
 */
export function LobbyWall({ rows }: { rows: ResponseRow[] }) {
  const { getName } = useUserLookup()
  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-40 items-center justify-center rounded-3xl border-2 border-dashed border-border text-xl text-muted-foreground">
        Waiting for the first person to join…
      </div>
    )
  }
  return (
    <ul data-testid="lobby-wall" className="flex flex-wrap content-start gap-3">
      {rows.map((r) => {
        const first = (getName(r.userId) ?? '').trim().split(/\s+/)[0] || 'Guest'
        return (
          <li
            key={r.userId}
            className={`pop-in rounded-full px-5 py-2.5 text-lg font-semibold ${
              r.submitted ? 'bg-primary text-primary-foreground' : 'border-2 border-foreground/15 bg-card'
            }`}
          >
            {r.submitted && <span aria-label="answered">✓ </span>}
            {first}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Returns a 3-2-1 count when `revealed` flips from false to true while the
 * page is open (not on a page load that's already revealed), then null.
 */
export function useRevealCountdown(revealed: boolean): number | null {
  const prev = useRef(revealed)
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    if (revealed && !prev.current) setCount(3)
    prev.current = revealed
  }, [revealed])
  useEffect(() => {
    if (count === null) return
    const t = setTimeout(() => setCount(count > 1 ? count - 1 : null), 800)
    return () => clearTimeout(t)
  }, [count])
  return count
}

export function CountdownOverlay({ count }: { count: number | null }) {
  if (count === null) return null
  return (
    <div
      data-testid="reveal-countdown"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary text-primary-foreground"
      aria-live="assertive"
    >
      <div className="text-xl uppercase tracking-[0.3em] opacity-80">Results in</div>
      <div key={count} className="count-pop font-display text-[10rem] font-bold leading-none sm:text-[14rem]">
        {count}
      </div>
    </div>
  )
}
