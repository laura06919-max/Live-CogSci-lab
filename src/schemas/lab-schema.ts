import type { CollectionSchema } from 'deepspace/schema'

/**
 * A live experiment session. Any signed-in user can host one.
 *
 * Members may only write the setup fields (writableFields). `phase`, `stats`
 * and the AI explanation are written exclusively by host-checked server
 * actions (`setPhase`, `explainResults`), so a host can't forge the room's
 * results and a reopened session can't keep a stale explanation.
 * A missing `phase` means open.
 */
export const sessionsSchema: CollectionSchema = {
  name: 'sessions',
  columns: [
    { name: 'code', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'hostId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'title', storage: 'text', interpretation: 'plain', maxLength: 80 },
    {
      name: 'experiment',
      storage: 'text',
      interpretation: { kind: 'select', options: ['anchoring', 'framing', 'stroop'] },
      required: true,
      immutable: true,
    },
    { name: 'phase', storage: 'text', interpretation: { kind: 'select', options: ['open', 'closed'] } },
    { name: 'stats', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'explanation', storage: 'text', interpretation: 'plain' },
    { name: 'sources', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'explainedAt', storage: 'number', interpretation: 'plain' },
  ],
  uniqueOn: ['code'],
  ownerField: 'hostId',
  permissions: {
    member: {
      read: true,
      create: true,
      update: 'own',
      delete: 'own',
      writableFields: ['code', 'hostId', 'title', 'experiment'],
    },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

/**
 * One participant's response in one session.
 *
 * Reads are server-enforced: `read: 'shared'` means a member receives a row
 * only if they own it (`userId`) or are in its `collaborators` list, which
 * `joinSession` sets to [hostId]. So participants see only their own answer,
 * the host sees the whole room, and nothing leaks over the WebSocket before
 * the reveal. Participants learn the room's results from `sessions.stats`.
 *
 * Members cannot create or update rows directly: `joinSession` assigns the
 * condition server-side, and `submitResponse` checks the session is still open
 * and that this is the caller's first submission. uniqueOn makes "one row per
 * person per session" hold even against a forged or double-tapped request.
 */
export const responsesSchema: CollectionSchema = {
  name: 'responses',
  columns: [
    { name: 'sessionId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'collaborators', storage: 'text', interpretation: { kind: 'json' }, immutable: true },
    { name: 'condition', storage: 'text', interpretation: 'plain', immutable: true },
    { name: 'submitted', storage: 'number', interpretation: { kind: 'boolean' } },
    { name: 'estimate', storage: 'number', interpretation: 'plain' },
    { name: 'choice', storage: 'text', interpretation: 'plain' },
    { name: 'congruentMs', storage: 'number', interpretation: 'plain' },
    { name: 'incongruentMs', storage: 'number', interpretation: 'plain' },
    { name: 'accuracy', storage: 'number', interpretation: 'plain' },
    { name: 'prediction', storage: 'number', interpretation: 'plain' },
    { name: 'predictedFrame', storage: 'text', interpretation: 'plain' },
  ],
  uniqueOn: ['sessionId', 'userId'],
  ownerField: 'userId',
  collaboratorsField: 'collaborators',
  permissions: {
    member: { read: 'shared', create: false, update: false, delete: false },
    admin: { read: true, create: false, update: false, delete: true },
  },
}
