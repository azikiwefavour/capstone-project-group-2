import { test, expect } from '@playwright/test'

// Browser fixtures are test-only. Requests never reach a real backend or database.
const token = `test.${Buffer.from(JSON.stringify({ sub: 'pharmacist-fixture', role: 'pharmacist', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`
const prescription = (id, createdAt) => ({ id, createdAt, status: 'pending', patientName: `Patient ${id}`, medicationName: `Medication ${id}`, reason: 'Indication from prescription', doctorName: 'Doctor fixture' })

async function prepare(page, options = {}) {
  await page.addInitScript(token => sessionStorage.setItem('medtrailPharmacistSession', JSON.stringify({ token })), token)
  const requests = []
  await page.route('**/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    requests.push({ path: url.pathname, search: url.search, method: request.method(), authorization: request.headers().authorization })
    let status = 200
    let data
    if (url.pathname === '/api/auth/profile') {
      if (options.profileGate) await options.profileGate
      data = { id: 'pharmacist-fixture', role: options.role || 'pharmacist', name: 'Verified pharmacist', isEmailVerified: true, invitationStatus: 'accepted' }
    } else if (url.pathname === '/api/pharmacy/prescriptions') {
      if (options.queueGate) await options.queueGate
      status = options.status || 200
      data = status === 200 ? options.records || [] : { message: 'Queue temporarily unavailable.' }
    } else if (url.pathname === '/api/pharmacy/dashboard') {
      data = { pharmacist: { id: 'pharmacist-fixture' }, stats: { awaitingClarification: 0, dispensed: 0 }, recentPrescriptions: [] }
    } else {
      status = 500
      data = { message: 'Unexpected request in queue test' }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
  })
  return requests
}

test('queue reuses dashboard navigation and profile, and displays only pending prescriptions oldest first', async ({ page }) => {
  const requests = await prepare(page, { records: [
    prescription('newer', '2026-10-19T10:00:00Z'),
    { ...prescription('dispensed', '2026-10-17T10:00:00Z'), status: 'dispensed' },
    prescription('older', '2026-10-18T10:00:00Z'),
  ] })
  await page.goto('/pharmacist/dashboard')
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Verification Queue', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/verification-queue$/)
  await expect(page.getByRole('heading', { name: 'Verification queue', exact: true })).toBeVisible()
  await expect(page.getByText('Oldest first. Open a prescription to review and verify it.', { exact: true })).toBeVisible()
  await expect(page.getByText('Welcome, Verified pharmacist', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Verification Queue', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).not.toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('columnheader')).toHaveText(['Patient', 'Medication', 'Prescribed by', 'Status', 'Date', 'Actions'])
  const rows = page.locator('tbody tr')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText('Patient older')
  await expect(rows.nth(1)).toContainText('Patient newer')
  await expect(rows.nth(0)).toContainText('Medication older')
  await expect(rows.nth(0)).toContainText('Indication from prescription')
  await expect(rows.nth(0)).toContainText('Doctor fixture')
  await expect(page.getByText('Unverified', { exact: true })).toHaveCount(2)
  await expect(rows.nth(0).locator('time')).toHaveAttribute('datetime', '2026-10-18T10:00:00.000Z')
  const expectedDate = await page.evaluate(() => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h12' }).formatToParts(new Date('2026-10-18T10:00:00Z')).map(({ type, value }) => [type, value]))
    return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} ${parts.dayPeriod.toUpperCase()}`
  })
  await expect(rows.nth(0).locator('time')).toHaveText(expectedDate)
  expect(requests.filter(request => request.path === '/api/pharmacy/prescriptions').every(request => request.search === '?status=pending')).toBe(true)
  expect(requests.every(request => request.method === 'GET' && request.authorization === `Bearer ${token}`)).toBe(true)
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await page.getByRole('dialog', { name: 'LOG OUT', exact: true }).getByRole('button', { name: 'Yes, Log out', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPharmacistSession'))).toBeNull()
})

test('missing display fields are unavailable and no indication or timestamp is invented', async ({ page }) => {
  await prepare(page, { records: [{ id: 'missing', status: 'pending', createdAt: '2026-10-19 10:00', date: '19 Oct 2026', instructions: 'Not an indication' }] })
  await page.goto('/pharmacist/verification-queue')
  const cells = page.locator('tbody tr td')
  await expect(cells).toHaveCount(6)
  await expect(cells.nth(0)).toHaveText('Name unavailable')
  await expect(cells.nth(1)).toHaveText('Medication unavailable')
  await expect(cells.nth(2)).toHaveText('—')
  await expect(cells.nth(4)).toHaveText('—')
  await expect(page.locator('time')).toHaveCount(0)
  await expect(page.getByText('Not an indication')).toHaveCount(0)
})

test('queue requests wait for verified profile, then show loading and empty states separately', async ({ page }) => {
  let releaseProfile, releaseQueue
  const profileGate = new Promise(resolve => { releaseProfile = resolve })
  const queueGate = new Promise(resolve => { releaseQueue = resolve })
  const requests = await prepare(page, { profileGate, queueGate })
  await page.goto('/pharmacist/verification-queue')
  await expect(page.getByRole('status')).toHaveText('Checking your session...')
  expect(requests.some(request => request.path === '/api/pharmacy/prescriptions')).toBe(false)
  releaseProfile()
  await expect(page.getByRole('status')).toHaveText('Loading prescriptions...')
  await expect(page.getByText('No prescriptions awaiting verification.', { exact: true })).toHaveCount(0)
  releaseQueue()
  await expect(page.getByRole('status')).toHaveText('No prescriptions awaiting verification.')
  await expect(page.getByText('Unverified', { exact: true })).toHaveCount(0)
})

test('failed queue requests display retry instead of an empty list', async ({ page }) => {
  const options = { status: 503 }
  await prepare(page, options)
  await page.goto('/pharmacist/verification-queue')
  await expect(page.getByRole('alert')).toContainText('Queue temporarily unavailable.')
  await expect(page.getByText('No prescriptions awaiting verification.', { exact: true })).toHaveCount(0)
  options.status = 200
  options.records = [prescription('retry', '2026-10-19T10:00:00Z')]
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('tbody tr')).toContainText('Patient retry')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('queue 401 returns to Pharmacist login', async ({ page }) => {
  await prepare(page, { status: 401 })
  await page.goto('/pharmacist/verification-queue')
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPharmacistSession'))).toBeNull()
})

test('an unauthenticated visit cannot request or display queue records', async ({ page }) => {
  const requests = []
  await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
  await page.goto('/pharmacist/verification-queue')
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(requests).toHaveLength(0)
})

test('three-dot actions close accessibly and never change records', async ({ page }) => {
  const requests = await prepare(page, { records: [prescription('menu', '2026-10-19T10:00:00Z')] })
  await page.goto('/pharmacist/verification-queue')
  const trigger = page.getByRole('button', { name: 'Prescription actions for Patient menu', exact: true })
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('menuitem', { name: 'Open prescription' })).toBeEnabled()
  // A queued scroll notification from bringing the trigger into view must not
  // dismiss the menu when its anchor position has not changed.
  await page.locator('main > section').evaluate(node => node.dispatchEvent(new Event('scroll')))
  await expect(page.getByRole('menu')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page.getByRole('heading', { name: 'Verification queue', exact: true }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)
  await trigger.click()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(page).toHaveURL(/\/pharmacist\/verification-queue$/)
  expect(requests.every(request => request.method === 'GET')).toBe(true)
})

test('queue action menu opens the selected prescription details without changing records', async ({ page }) => {
  const requests = await prepare(page, { records: [prescription('menu', '2026-10-19T10:00:00Z')] })
  await page.goto('/pharmacist/verification-queue')
  await page.getByRole('button', { name: 'Prescription actions for Patient menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Open prescription' }).click()
  await expect(page).toHaveURL(/\/pharmacist\/verification-queue\/menu$/)
  await expect(page.getByRole('heading', { name: 'Patient menu', exact: true })).toBeVisible()
  expect(requests.every(request => request.method === 'GET')).toBe(true)
})

for (const width of [390, 1024, 1440]) {
  test(`queue keeps dashboard styling and table scrolls within content at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await prepare(page, { records: [prescription('responsive', '2026-10-19T10:00:00Z')] })
    await page.goto('/pharmacist/verification-queue')
    await expect(page.getByText('Unverified', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    expect(await page.locator('aside').evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(71, 90, 162)')
    await page.getByRole('button', { name: 'Prescription actions for Patient responsive', exact: true }).scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: 'Prescription actions for Patient responsive', exact: true }).click()
    const menu = await page.getByRole('menu').boundingBox()
    expect(menu.x).toBeGreaterThanOrEqual(0)
    expect(menu.x + menu.width).toBeLessThanOrEqual(width)
    await page.keyboard.press('Escape')
    await page.locator('table').evaluate(node => { node.parentElement.scrollLeft = 0 })
    await page.screenshot({ path: testInfo.outputPath(`pharmacist-queue-${width}.png`), fullPage: true })
  })
}
