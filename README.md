# Live CogSci Lab

Run a classic cognitive-psychology experiment with a whole room in under two minutes.

A host picks an effect (**anchoring**, **framing** or **Stroop**) and gets a 5-letter code. Participants
join on their phones. The server randomly assigns each person to a condition and collects their answer.
When the host closes the session, the room's own results are charted live. A host-only button then pulls
the original papers from Google Scholar and asks Claude to explain *this room's* numbers, citing only
those papers.

Built on [DeepSpace](https://docs.deep.space) for a five-day build exercise.

## How it works

| Piece | Where | DeepSpace primitive |
| --- | --- | --- |
| Sessions and responses sync live to every screen | `src/schemas/lab-schema.ts`, `useQuery` in `src/pages/(app)/(protected)/lab/[id].tsx` | RecordRoom collections over WebSocket |
| Rules enforced on the server | `lab-schema.ts` | RBAC permissions, `uniqueOn`, `userBound`, `immutable`, `ownerField` |
| Join (random condition assignment) and submit (session open? first answer? valid value?) | `src/actions/index.ts` | Server actions |
| "Explain these results" | `explainResults` in `src/actions/index.ts` | Integrations: `scholar/search-papers` → `anthropic/chat-completion` |
| Sign-in | `(protected)` route group | DeepSpace auth (`AuthGate`) |

### Why the writes go through server actions

An experiment is only valid if participants can't choose their own condition or answer after the reveal.
So the `responses` collection gives members **no** create or update permission. The only write path is
two server actions:

- `joinSession` assigns the condition on the server. It puts the newcomer in the smaller group and breaks
  ties at random, so small classes stay balanced. It is idempotent, and `uniqueOn: [sessionId, userId]`
  guarantees one row per person even against a forged or double-tapped request.
- `submitResponse` checks that the session is open, the caller joined and hasn't answered yet, and the
  value is in range (for example, Stroop RTs between 100 and 10,000 ms).

The host flips `phase` with an ordinary client write. `ownerField: 'hostId'` plus `userBound` means only
the host can do that.

### Why Scholar → Claude, and not just Claude

LLMs make up plausible citations. The action first fetches real papers for the effect, then tells Claude
to cite only those numbered sources. The sources are stored with the explanation and shown as links. The
action is **host-only**, needs **at least 2 answers** and is **rate-limited to once per minute per
session**, because it spends the app owner's credits. It works out the statistics itself from the
database rather than trusting numbers sent by the client.

## Tradeoffs and what I left out

- **Main tradeoff: participants must sign in.** Anonymous joining would make classroom use faster.
  But one-answer-per-person and "you can't pick your condition" both depend on a verified identity, and
  without them the experiment data is meaningless. I chose valid data over the faster join.
- **Raw responses are readable by any signed-in user.** The host UI hides results until the reveal, but
  `responses` has `read: true` for members, so a technical participant could read answers over the
  WebSocket. Rows hold no names, only user ids and answers. The fix is a `collaboratorsField` holding the
  host id with `read: 'shared'`.
- **Not added:** an AI chat assistant (the one-shot explanation covers the need), image generation
  (adds nothing to an experiment), presence avatars (the "joined / answered" counters give the host the
  same information), and payments.
- **Stroop timing** uses `performance.now()` on the participant's phone, so it includes touch latency.
  That's fine for comparing congruent vs. incongruent within one person, but it isn't lab-grade.

## What I'd do next

1. Close the raw-response read gap described above.
2. Add a two-user Playwright spec (host + participant) for the full flow, using the scaffold's multi-user fixture.
3. Add a QR code on the host screen and CSV export for instructors.
4. Add more experiments (the Linda problem, the Müller-Lyer illusion) through the same `EXPERIMENTS` registry.

## Run it

```bash
npm install
npx deepspace auth login
npx deepspace dev start      # local
npx deepspace deploy         # → <name>.app.space
npm run test:unit            # stats unit tests (vitest)
```
