/** Participant entry: type the code shown on the projector. */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { Button, Input } from '@/components/ui'
import type { Session } from '../../../experiments'

export default function JoinPage() {
  const [params] = useSearchParams()
  const [code, setCode] = useState((params.get('code') ?? '').toUpperCase())
  const [submitted, setSubmitted] = useState(code.length === 5)
  const navigate = useNavigate()
  const lookup = code.length === 5 && submitted ? code : '__none__'
  const { records, status } = useQuery<Session>('sessions', { where: { code: lookup } })

  useEffect(() => {
    if (submitted && status === 'ready' && records[0]) navigate(`/lab/${records[0].recordId}`, { replace: true })
  }, [submitted, status, records, navigate])

  const notFound = submitted && status === 'ready' && records.length === 0

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Join an experiment</h1>
      <p className="mt-2 text-muted-foreground">Enter the 5-letter code on the screen.</p>
      <form
        className="mt-8 flex w-full flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setSubmitted(true)
        }}
      >
        <Input
          data-testid="join-code"
          autoFocus
          inputMode="text"
          autoCapitalize="characters"
          maxLength={5}
          value={code}
          onChange={(e) => {
            setSubmitted(false)
            setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))
          }}
          className="h-14 text-center font-mono text-3xl tracking-[0.4em]"
          placeholder="ABCDE"
        />
        <Button type="submit" disabled={code.length !== 5}>
          Join
        </Button>
      </form>
      {notFound && <p className="mt-4 text-sm text-destructive">No session with that code.</p>}
    </div>
  )
}
