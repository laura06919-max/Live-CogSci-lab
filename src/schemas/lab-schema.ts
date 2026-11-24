import type { CollectionSchema } from 'deepspace/schema'

/**
 * A live experiment session. Any signed-in user can host one; only the host
 * (creator) can open/close it. The AI explanation fields are written by the
 * `explainResults` server action, which checks the caller is the host.
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
    { name: 'explanation', storage: 'text', interpretation: 'plain' },
    { name: 'sources', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'explainedAt', storage: 'number', interpretation: 'plain' },
  ],
  uniqueOn: ['code'],
  ownerField: 'hostId',
  permissions: {
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

/**
 * One participant's response in one session.
 *
 * Members cannot create or update rows directly: the `joinSession` action
 * assigns the condition server-side, and `submitResponse` checks the session
 * is still open and that this is the caller's first submission. uniqueOn makes
 * "one row per person per session" hold even against a forged write.
 */
export const responsesSchema: CollectionSchema = {
  name: 'responses',
  columns: [
    { name: 'sessionId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'condition', storage: 'text', interpretation: 'plain', immutable: true },
    { name: 'submitted', storage: 'number', interpretation: { kind: 'boolean' } },
    { name: 'estimate', storage: 'number', interpretation: 'plain' },
    { name: 'choice', storage: 'text', interpretation: 'plain' },
    { name: 'congruentMs', storage: 'number', interpretation: 'plain' },
    { name: 'incongruentMs', storage: 'number', interpretation: 'plain' },
    { name: 'accuracy', storage: 'number', interpretation: 'plain' },
  ],
  uniqueOn: ['sessionId', 'userId'],
  ownerField: 'userId',
  permissions: {
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: false, update: false, delete: true },
  },
}
