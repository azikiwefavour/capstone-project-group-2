import { test, expect } from '@playwright/test'

// Test-only backend-contract responses. Application pages never import fixtures.
const expiresAt = Math.floor(Date.now() / 1000) + 600
const token = `test.${Buffer.from(JSON.stringify({ sub: 'pharmacist-fixture', role: 'pharmacist', exp: expiresAt })).toString('base64url')}.test`
const prescription = (id, patientId = id) => ({ id: `rx-${id}`, patientId: `patient-${patientId}`, patientName: `Patient ${patientId}`, patientEmail: `patient-${patientId}@example.test`, createdAt: '2026-10-19T10:00:00Z' })
const dashboard = prescriptions => ({ pharmacist: { id: 'pharmacist-fixture', name: 'Name from dashboard' }, stats: { total: 15, pending: 6, awaitingClarification: 2, dispensed: 7 }, recentPrescriptions: prescriptions })

async function prepare(page, options = {}) {
  await page.addInitScript(token => sessionStorage.setItem('medtrailPharmacistSession', JSON.stringify({ token })), token)
  const requests = []
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    requests.push({ path, method: request.method(), authorization: request.headers().authorization })
    let status = 200
    let data
    if (path === '/api/auth/profile') {
      if (options.profileGate) await options.profileGate
      data = { id: 'pharmacist-fixture', role: 'pharmacist', name: 'Verified pharmacist', isEmailVerified: true, invitationStatus: 'accepted' }
    } else if (path === '/api/pharmacy/dashboard') {
      status = options.status || 200
      data = status === 200 ? options.data || dashboard([]) : { message: 'Dashboard temporarily unavailable.' }
    } else {
      status = 500
      data = { message: 'Unexpected request in dashboard test' }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
  })
  return requests
}

test('dashboard uses the verified name, actual metrics and patients, and preserves logout', async ({ page }) => {
  const requests = await prepare(page, { data: dashboard([prescription(1), prescription(2), prescription(3, 1)]) })
  await page.goto('/pharmacist/dashboard')
  await expect(page.getByText('Welcome, Verified pharmacist', { exact: true })).toBeVisible()
  await expect(page.getByText('Name from dashboard', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
  await expect(page.getByText("Review each prescription against the patient's current medications.", { exact: true })).toBeVisible()
  await expect(page.getByLabel('2 Awaiting Clarification', { exact: true })).toBeVisible()
  await expect(page.getByLabel('7 Dispensed Medications', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Verified Prescriptions count unavailable', { exact: true })).toHaveText('—')
  const patients = page.getByRole('list', { name: 'Recent patients' })
  await expect(patients.getByRole('listitem')).toHaveCount(2)
  await expect(patients.getByText('Patient 1', { exact: true })).toBeVisible()
  await expect(patients.getByText('patient-1@example.test', { exact: true })).toBeVisible()
  await expect(page.getByText('Recent activities are not available yet.', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Recent Activities', exact: true }).getByRole('button', { name: 'View All' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Open settings', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'View notifications', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Verification Queue', exact: true })).toHaveAttribute('href', '/pharmacist/verification-queue')
  await expect(page.getByRole('link', { name: 'Clarifications', exact: true })).toHaveAttribute('href', '/pharmacist/clarifications')
  await expect(page.getByRole('navigation', { name: 'Pharmacist navigation' }).getByRole('link', { name: 'Dispensed medication', exact: true })).toHaveAttribute('href', '/pharmacist/dispensed-medication')
  expect(requests.every(request => request.method === 'GET' && request.authorization === `Bearer ${token}`)).toBe(true)
  expect(requests.some(request => /\/api\/(doctor|admin)\//.test(request.path))).toBe(false)
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await page.getByRole('dialog', { name: 'LOG OUT', exact: true }).getByRole('button', { name: 'Yes, Log out', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPharmacistSession'))).toBeNull()
})

test('dashboard records are requested only after the profile is verified', async ({ page }) => {
  let release
  const profileGate = new Promise(resolve => { release = resolve })
  const requests = await prepare(page, { profileGate })
  await page.goto('/pharmacist/dashboard')
  await expect(page.getByRole('status')).toHaveText('Checking your session...')
  expect(requests.some(request => request.path === '/api/pharmacy/dashboard')).toBe(false)
  release()
  await expect(page.getByLabel('2 Awaiting Clarification', { exact: true })).toBeVisible()
})

test('empty pharmacy data displays real zero counts without sample records', async ({ page }) => {
  await prepare(page, { data: { ...dashboard([]), stats: { total: 0, pending: 0, awaitingClarification: 0, dispensed: 0 } } })
  await page.goto('/pharmacist/dashboard')
  await expect(page.getByLabel('0 Awaiting Clarification', { exact: true })).toBeVisible()
  await expect(page.getByLabel('0 Dispensed Medications', { exact: true })).toBeVisible()
  await expect(page.getByText('No recent patient records', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Recent patients' })).toHaveCount(0)
  await expect(page.getByLabel('Verified Prescriptions count unavailable', { exact: true })).toHaveText('—')
})

test('View All expands only the received recent patients inside the dashboard', async ({ page }) => {
  const requests = await prepare(page, { data: dashboard(Array.from({ length: 8 }, (_, index) => prescription(index + 1))) })
  await page.goto('/pharmacist/dashboard')
  const patients = page.getByRole('list', { name: 'Recent patients' })
  await expect(patients.getByRole('listitem')).toHaveCount(5)
  const count = requests.filter(request => request.path === '/api/pharmacy/dashboard').length
  await page.getByRole('region', { name: 'Recent Patients', exact: true }).getByRole('link', { name: 'View All' }).click()
  await expect(patients.getByRole('listitem')).toHaveCount(8)
  await expect(page).toHaveURL(/\/pharmacist\/dashboard\?patients=all#recent-patients$/)
  expect(requests.filter(request => request.path === '/api/pharmacy/dashboard').length).toBe(count)
  await page.getByRole('link', { name: 'View Less', exact: true }).click()
  await expect(patients.getByRole('listitem')).toHaveCount(5)
})

test('dashboard errors show retry and do not invent zero counts or patients', async ({ page }) => {
  const options = { status: 503 }
  await prepare(page, options)
  await page.goto('/pharmacist/dashboard')
  await expect(page.getByRole('alert')).toContainText('Dashboard temporarily unavailable.')
  await expect(page.getByLabel('Awaiting Clarification count unavailable', { exact: true })).toHaveText('—')
  await expect(page.getByText('Patient records unavailable', { exact: true })).toBeVisible()
  await expect(page.getByText('No recent patient records', { exact: true })).toHaveCount(0)
  options.status = 200
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByLabel('2 Awaiting Clarification', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

for (const viewport of [{ width: 390, height: 844 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`dashboard preserves the Doctor responsive structure at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await prepare(page, { data: dashboard([prescription(1), prescription(2)]) })
    await page.goto('/pharmacist/dashboard')
    await expect(page.getByLabel('2 Awaiting Clarification', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    expect(await page.locator('aside').evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(71, 90, 162)')
    const cards = page.getByRole('region', { name: 'Pharmacist statistics' }).locator('article')
    await expect(cards).toHaveCount(3)
    if (viewport.width >= 1024) {
      const first = await cards.nth(0).boundingBox()
      const last = await cards.nth(2).boundingBox()
      expect(first.y).toBe(last.y)
      expect((await page.locator('aside').boundingBox()).height).toBe(viewport.height)
    }
    await page.screenshot({ path: testInfo.outputPath(`pharmacist-dashboard-${viewport.width}.png`), fullPage: true })
  })
}
