# Bias Mirror · Live CogSci Lab

**See your decision, your room, and the research side by side.**

A host picks a classic effect (**anchoring**, **framing** or **Stroop**). The room joins by QR code or a
5-letter code. The server secretly assigns each person to a condition. After answering, everyone
**predicts** how big the room's effect will be. At the reveal, every phone shows a three-level mirror:

1. **Me:** my condition, my answer, my prediction. *("You saw the high anchor: 140. You guessed 93.")*
2. **Us:** what the room did. *("Your group averaged 87; the low-anchor group averaged 61, a 26-year gap.")*
3. **Evidence:** a "We predicted → What happened → What research found" panel, plus an optional AI debrief
   that may cite only fixed classic papers.

Classroom tools for running experiments already exist (Classperiment, PsyToolkit). This project's focus is
the **personal, evidence-grounded debrief** and the **prediction step**: students find out not only that they
are biased, but whether they can estimate their own bias.

Built on [DeepSpace](https://docs.deep.space) for a five-day build exercise.

## How it works

| Piece | Where | DeepSpace primitive |
| --- | --- | --- |
| Sessions and responses sync live to every screen | `src/schemas/lab-schema.ts`; `useQuery` in `src/pages/(app)/(protected)/lab/[id].tsx` | RecordRoom collections over WebSocket |
| Server-enforced privacy and integrity | `lab-schema.ts` | RBAC: `read: 'shared'` + `collaboratorsField`, `writableFields`, `uniqueOn`, `userBound`, `immutable`, `ownerField` |
| Join, submit, reveal/reopen, explain | `src/actions/index.ts` | Server actions |
| AI debrief | `explainResults` | Integrations: `scholar/search-papers` (link lookup) → `anthropic/chat-completion` |
| Sign-in | `(protected)` route group | DeepSpace auth |
| Shared stats math (charts, debrief, AI prompt) | `computeStats` in `src/experiments.ts` (unit-tested) | — |

### What the server enforces, and why

An experiment is only valid if participants can't choose their condition, answer twice, answer after the
reveal, or peek at other people's answers. The UI hiding something doesn't count, because the DeepSpace docs
are explicit that client-side filtering is not a security boundary. So:

- **Pre-reveal privacy.** `responses` uses `read: 'shared'` with `collaboratorsField: 'collaborators'`.
  `joinSession` sets `collaborators = [hostId]`. The room's Durable Object sends a participant only their own
  row and sends the host every row. Nothing leaks over the WebSocket.
- **Results reach participants through the session, not the rows.** On reveal, the host-only `setPhase`
  action computes the room's stats on the server and writes them to `sessions.stats`. Each debrief is built
  from that plus the participant's own row.
- **Members can't write `phase`, `stats` or the explanation.** `writableFields` on `sessions` limits members
  to the setup fields, so results can't be forged and the reveal always goes through `setPhase`.
- **No stale explanations.** Reopening a session clears `stats`, `explanation` and `sources`. The host is
  asked to confirm first.
- **Condition assignment** happens in `joinSession`: the newcomer goes into the smaller group, with ties
  broken at random. `uniqueOn: [sessionId, userId]` keeps one row per person even against a forged or
  double-tapped request. Members have no create/update permission on `responses` at all.
- **`submitResponse`** checks the session is open, the caller joined and hasn't answered, and the values are
  in range.

### Citation grounding

LLMs make up plausible citations. Each experiment has **two canonical papers chosen in advance** (for
example Strack & Mussweiler 1997 for the Gandhi anchoring study, and Tversky & Kahneman 1981 for framing).
Google Scholar is used only to find a link for each one, and a hit is accepted only if its title matches.
Claude receives only those numbered sources and is told to cite nothing else. The action is host-only, runs
only after the reveal, needs at least 2 answers, is rate-limited to once a minute per session (it spends the
owner's credits), and recomputes stats from the database rather than trusting client numbers.

## Tradeoffs and what I left out

- **Main tradeoff: participants must sign in.** Anonymous joining would be faster in a lecture hall. But
  one answer per person, server-assigned conditions and "you can only read your own row" all depend on a
  verified identity. Without that, the experiment data and the privacy guarantee mean nothing.
- **Depth over breadth:** three experiments with a personal debrief and a prediction step, instead of a
  large library of paradigms.
- **Not added:** an AI chat assistant (a one-shot debrief covers the need), image generation (adds nothing
  to an experiment), presence avatars (the joined/answered counters give the host the same information),
  payments.
- **Stroop timing** uses `performance.now()` on the participant's phone, so it includes touch latency.
  That's fine for comparing congruent vs. incongruent within one person, but it isn't lab-grade.
- The "research found" one-liners are fixed text written from the canonical papers, not fetched live.

## Testing

- `npm run test:unit`: 12 vitest tests for the stats math and Scholar title matching.
- `tests/lab-flow.spec.ts`: a two-user Playwright spec (host + participant) using DeepSpace's multi-user
  fixture. It covers create → join by code → live counters → answer + predict → reveal → personal debrief.
  It deliberately doesn't click the paid AI button. Run it with `npx deepspace test run all`.

## What I'd do next

1. Show confidence intervals once a group has 10 or more answers, and warn about very small groups.
2. Let instructors export CSV and compare sections over a term.
3. Add more paradigms (the Linda problem, the Müller-Lyer illusion) through the same `EXPERIMENTS` registry,
   each with canonical sources.

## Run it

```bash
npm install
npx deepspace auth login
npx deepspace dev start      # local
npx deepspace deploy         # → <name>.app.space
npm run test:unit            # stats unit tests (vitest)
```
