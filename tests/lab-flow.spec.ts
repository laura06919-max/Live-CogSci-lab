/**
 * Full experiment flow with two real signed-in users (host + participant):
 * host starts a framing session → participant joins by code → host's live
 * counter updates → participant answers and predicts → host reveals →
 * participant's personal debrief appears from server-published stats.
 *
 * The AI explanation is deliberately not clicked: it spends real credits on
 * Scholar + Claude (see docs.deep.space/guides/external-apis "Testing").
 *
 * Run: npx deepspace test run all   (needs 2 test accounts, see collab.spec.ts)
 */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

test.skip(loadAllTestAccounts().length < 2, 'Needs 2 usable test accounts (see collab.spec.ts).')

test('host runs a framing session; participant gets a personal debrief', async ({ users }) => {
  const [host, participant] = await users(2)

  // Host starts a session.
  await host.page.goto('/host')
  await host.page.getByTestId('pick-framing').click()
  await host.page.getByTestId('start-session').click()
  const codeEl = host.page.getByTestId('session-code')
  await expect(codeEl).toHaveText(/^[A-Z]{5}$/, { timeout: 15_000 })
  const code = (await codeEl.textContent())!.trim()
  await expect(host.page.getByTestId('join-qr')).toBeVisible()

  // Participant joins through the QR-code URL shape.
  await participant.page.goto(`/join?code=${code}`)
  await expect(participant.page.getByTestId('choice-sure')).toBeVisible({ timeout: 15_000 })
  await expect(host.page.getByTestId('joined-count')).toHaveText('1', { timeout: 15_000 })

  // Answer, then predict, then the row is submitted.
  await participant.page.getByTestId('choice-sure').click()
  await participant.page.getByTestId('predict-gain').click()
  await expect(participant.page.getByTestId('done')).toBeVisible({ timeout: 15_000 })
  await expect(host.page.getByTestId('submitted-count')).toHaveText('1', { timeout: 15_000 })

  // Reveal: server computes stats; both screens update live.
  await host.page.getByTestId('toggle-phase').click()
  await expect(host.page.getByTestId('results')).toBeVisible({ timeout: 15_000 })
  await expect(host.page.getByTestId('three-way')).toBeVisible()
  await expect(participant.page.getByTestId('debrief')).toBeVisible({ timeout: 15_000 })
  await expect(participant.page.getByTestId('debrief')).toContainText('chose the sure option')

  // The experiment now appears in the participant's private lab notebook.
  await participant.page.goto('/notebook')
  await expect(participant.page.getByTestId('notebook-entry').first()).toContainText('Framing effect', { timeout: 15_000 })
  await expect(participant.page.getByTestId('notebook-entry').first()).toContainText('Judgment & decision-making')

})
