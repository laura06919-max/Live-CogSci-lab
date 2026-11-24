import { getAuthToken } from 'deepspace'

export type ActionResponse<T = unknown> = { success: true; data: T } | { success: false; error: string }

/** POST to a server action defined in src/actions/index.ts with the caller's JWT. */
export async function callAction<T = unknown>(
  name: 'joinSession' | 'submitResponse' | 'setPhase' | 'explainResults',
  params: Record<string, unknown>,
): Promise<ActionResponse<T>> {
  try {
    const token = await getAuthToken()
    const res = await fetch(`/api/actions/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify(params),
    })
    if (res.status === 401) return { success: false, error: 'Please sign in again' }
    const body = (await res.json()) as ActionResponse<T>
    if (!body.success && !body.error) return { success: false, error: `Request failed (${res.status})` }
    return body
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}
