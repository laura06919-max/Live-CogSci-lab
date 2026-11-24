/**
 * One live session. The host sees the join code, live results and the AI
 * explanation; everyone else sees the participant task. Both views subscribe
 * to the same records, so the host's chart updates the moment anyone submits.
 */
import { useParams } from 'react-router-dom'
import { useAuth, useQuery } from 'deepspace'
import type { ResponseRow, Session } from '../../../../experiments'
import HostView from '../../../../components/lab/HostView'
import ParticipantView from '../../../../components/lab/ParticipantView'

export default function LabPage() {
  const { id = '' } = useParams()
  const { userId } = useAuth()
  // `where` matches data fields only, so subscribe to sessions and pick by id.
  const sessions = useQuery<Session>('sessions')
  const responses = useQuery<ResponseRow>('responses', { where: { sessionId: id } })
  const session = sessions.records.find((r) => r.recordId === id)

  if (sessions.status === 'loading') {
    return <p className="p-10 text-center text-muted-foreground">Loading…</p>
  }
  if (!session) {
    return <p className="p-10 text-center text-muted-foreground">This session doesn&apos;t exist.</p>
  }
  const rows = responses.records.map((r) => r.data)
  if (session.data.hostId === userId) {
    return <HostView sessionId={id} session={session.data} rows={rows} />
  }
  const mine = rows.find((r) => r.userId === userId)
  return <ParticipantView sessionId={id} session={session.data} mine={mine} />
}
