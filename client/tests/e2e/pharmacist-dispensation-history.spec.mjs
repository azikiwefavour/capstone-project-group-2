import { test, expect } from '@playwright/test'

// Backend-contract fixtures are confined to tests. No real dispensing occurs.
const token = `test.${Buffer.from(JSON.stringify({ sub: 'pharmacist-fixture', role: 'pharmacist', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`
const record = (number, values = {}) => ({ id: `dispensed-${number}`, status: 'dispensed', patientName: `Patient fixture ${number}`, medicationName: `Medication fixture ${number}`, reason: 'Indication from prescription', dosage: '10 mg', frequency: 'Daily', doctorName: 'Dr. Prescriber Fixture', createdAt: '2026-10-19T10:00:00Z', updatedAt: '2026-10-20T12:00:00Z', date: '19 Oct, 26, 10:00am', ...values })

async function prepare(page, options = {}) {
  await page.addInitScript(token => sessionStorage.setItem('medtrailPharmacistSession', JSON.stringify({ token })), token)
  const requests = []
  await page.route('**/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    requests.push({ path: url.pathname, query: url.search, method: request.method(), authorization: request.headers().authorization })
    let status = 200, data
    if (url.pathname === '/api/auth/profile') {
      if (options.profileGate) await options.profileGate
      data = { id: 'pharmacist-fixture', name: 'Verified pharmacist', role: options.role || 'pharmacist', isEmailVerified: true, invitationStatus: 'accepted' }
    } else if (url.pathname === '/api/pharmacy/prescriptions' && request.method() === 'GET') {
      if (options.recordsGate) await options.recordsGate
      status = options.status || 200
      // Return mixed statuses when requested to exercise the frontend guard too.
      data = status === 200 ? options.records || [] : { message: 'Dispensation history temporarily unavailable.' }
    } else { status = 500; data = { message: 'Unexpected API request in history test' } }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
  })
  return requests
}

test('sidebar opens history with the existing profile, real medication fields, and unavailable dispensing dates', async ({ page }) => {
  const requests = await prepare(page, { records: [record(1), record(2, { status: 'pending' })] })
  await page.goto('/pharmacist/verification-queue')
  await page.getByRole('link', { name: 'Dispensed medication', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/dispensed-medication$/)
  await expect(page.getByRole('heading', { name: 'Dispensation History', exact: true })).toBeVisible()
  await expect(page.getByText('All medications dispensed to patients', { exact: true })).toBeVisible()
  await expect(page.getByText('Welcome, Verified pharmacist', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Dispensed medication', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: 'Verification Queue', exact: true })).not.toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('columnheader')).toHaveText(['Medication', 'Patient', 'Dose and frequency', 'Prescribed by', 'Dispensed on'])
  const rows = page.locator('tbody tr')
  await expect(rows).toHaveCount(1)
  for (const text of ['Medication fixture 1', 'Patient fixture 1', 'Indication from prescription', '10 mg', 'Daily', 'Dr. Prescriber Fixture']) await expect(rows.first()).toContainText(text)
  await expect(page.getByLabel('Dispensing date unavailable', { exact: true })).toHaveText('—')
  await expect(page.locator('time')).toHaveCount(0)
  await expect(page.getByText('19 Oct, 26, 10:00am', { exact: true })).toHaveCount(0)
  expect(requests.some(request => request.query === '?status=dispensed')).toBe(true)
  expect(requests.every(request => request.method === 'GET' && request.authorization === `Bearer ${token}`)).toBe(true)
  expect(requests.every(request => ['/api/auth/profile', '/api/pharmacy/prescriptions'].includes(request.path))).toBe(true)
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await page.getByRole('dialog', { name: 'LOG OUT', exact: true }).getByRole('button', { name: 'Yes, Log out', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPharmacistSession'))).toBeNull()
})

test('page numbers, previous/next and page size paginate only the received records', async ({ page }) => {
  const requests = await prepare(page, { records: Array.from({ length: 20 }, (_, index) => record(index + 1)) })
  await page.goto('/pharmacist/dispensed-medication')
  const rows = page.locator('tbody tr')
  await expect(rows).toHaveCount(7)
  await expect(rows.first()).toContainText('Medication fixture 1')
  await expect(page.getByRole('button', { name: 'Previous page', exact: true })).toBeDisabled()
  const count = requests.length
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(rows.first()).toContainText('Medication fixture 8')
  await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Page 3', exact: true }).click()
  await expect(rows).toHaveCount(6)
  await expect(rows.first()).toContainText('Medication fixture 15')
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Previous page', exact: true }).click()
  await expect(rows.first()).toContainText('Medication fixture 8')
  await page.getByRole('combobox', { name: 'Rows per page', exact: true }).selectOption('14')
  await expect(rows).toHaveCount(14)
  await expect(rows.first()).toContainText('Medication fixture 1')
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(rows).toHaveCount(6)
  await page.getByRole('combobox', { name: 'Rows per page', exact: true }).selectOption('28')
  await expect(rows).toHaveCount(20)
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
  expect(requests.length).toBe(count)
})

test('search is case-insensitive across available fields, resets pagination and distinguishes no matches', async ({ page }) => {
  const data = Array.from({ length: 20 }, (_, index) => record(index + 1))
  data[3].reason = 'Unique indication fixture'
  data[5].doctorName = 'Dr. Alternate Prescriber'
  const requests = await prepare(page, { records: data })
  await page.goto('/pharmacist/dispensed-medication')
  await page.getByRole('button', { name: 'Page 3', exact: true }).click()
  const search = page.getByRole('searchbox', { name: 'Search dispensed medications', exact: true })
  const count = requests.length
  await search.fill('  PATIENT FIXTURE 19  ')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody tr')).toContainText('Patient fixture 19')
  await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
  await search.fill('unique indication')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody tr')).toContainText('Medication fixture 4')
  await search.fill('alternate prescriber')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody tr')).toContainText('Medication fixture 6')
  await search.fill('no matching medication')
  await expect(page.getByRole('status')).toHaveText('No dispensed medications match your search.')
  await expect(page.getByText('No medications have been dispensed yet', { exact: true })).toHaveCount(0)
  await search.fill(' ')
  await expect(page.locator('tbody tr')).toHaveCount(7)
  await expect(page.locator('tbody tr').first()).toContainText('Medication fixture 1')
  expect(requests.length).toBe(count)
})

test('empty history contains no invented records and disables pagination', async ({ page }) => {
  await prepare(page)
  await page.goto('/pharmacist/dispensed-medication')
  await expect(page.getByRole('status')).toHaveText('No medications have been dispensed yet')
  await expect(page.locator('tbody tr')).toHaveCount(0)
  for (const name of ['Previous page', 'Next page', 'Page 1']) await expect(page.getByRole('button', { name, exact: true })).toBeDisabled()
  await page.getByRole('searchbox', { name: 'Search dispensed medications', exact: true }).fill('Anything')
  await expect(page.getByRole('status')).toHaveText('No medications have been dispensed yet')
})

test('server failures show retry without a false empty history', async ({ page }) => {
  const options = { status: 503 }
  await prepare(page, options)
  await page.goto('/pharmacist/dispensed-medication')
  await expect(page.getByRole('alert')).toContainText('Dispensation history temporarily unavailable.')
  await expect(page.getByText('No medications have been dispensed yet', { exact: true })).toHaveCount(0)
  options.status = 200
  options.records = [record(1)]
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('history waits for the verified profile and shows loading separately from empty records', async ({ page }) => {
  let releaseProfile, releaseRecords
  const options = { profileGate: new Promise(resolve => { releaseProfile = resolve }), recordsGate: new Promise(resolve => { releaseRecords = resolve }) }
  const requests = await prepare(page, options)
  await page.goto('/pharmacist/dispensed-medication')
  await expect(page.getByRole('status')).toHaveText('Checking your session...')
  expect(requests.some(request => request.path === '/api/pharmacy/prescriptions')).toBe(false)
  releaseProfile()
  await expect(page.getByRole('status')).toHaveText('Loading dispensed medications...')
  await expect(page.getByText('No medications have been dispensed yet', { exact: true })).toHaveCount(0)
  releaseRecords()
  await expect(page.getByRole('status')).toHaveText('No medications have been dispensed yet')
})

test('missing display fields stay unavailable and combined dose is shown without guessing', async ({ page }) => {
  await prepare(page, { records: [{ id: 'missing', status: 'dispensed', doseAndFrequency: 'Combined value from backend' }] })
  await page.goto('/pharmacist/dispensed-medication')
  const cells = page.locator('tbody tr td')
  await expect(cells).toHaveText(['Medication unavailable', 'Name unavailable', 'Combined value from backend', '—', '—'])
})

test('history remains protected against missing sessions, wrong-role profiles and expired backend sessions', async ({ page }) => {
  const anonymousRequests = []
  await page.route('**/api/**', route => { anonymousRequests.push(route.request().url()); return route.abort() })
  await page.goto('/pharmacist/dispensed-medication')
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(anonymousRequests).toHaveLength(0)
  await page.unroute('**/api/**')
  const options = { role: 'doctor' }
  const requests = await prepare(page, options)
  await page.goto('/pharmacist/dispensed-medication')
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(requests.some(request => request.path === '/api/pharmacy/prescriptions')).toBe(false)
  options.role = 'pharmacist'
  options.status = 401
  await page.goto('/pharmacist/dispensed-medication')
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPharmacistSession'))).toBeNull()
})

for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1440, height: 900 }]) {
  test(`pagination stays at the content bottom with empty and short history at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const options = { records: [] }
    await prepare(page, options)
    await page.goto('/pharmacist/dispensed-medication')
    await expect(page.getByRole('status')).toHaveText('No medications have been dispensed yet')
    const history = page.getByRole('region', { name: 'Dispensation history', exact: true })
    const footer = history.locator(':scope > div').last()
    const emptyFooter = await footer.boundingBox()
    const contentBottom = await page.locator('main > section').evaluate(node => node.getBoundingClientRect().bottom - parseFloat(getComputedStyle(node).paddingBottom))
    expect(Math.abs(emptyFooter.y + emptyFooter.height - contentBottom)).toBeLessThanOrEqual(1)
    const count = await page.getByText('Page 1 of 1', { exact: true }).boundingBox()
    const controls = await page.getByRole('navigation', { name: 'Table pagination', exact: true }).boundingBox()
    const selector = await page.getByRole('combobox', { name: 'Rows per page', exact: true }).boundingBox()
    expect(count.x).toBeLessThan(controls.x)
    expect(controls.x + controls.width).toBeLessThanOrEqual(selector.x)
    expect(Math.abs(count.y + count.height / 2 - selector.y - selector.height / 2)).toBeLessThanOrEqual(1)
    const header = await page.locator('thead').boundingBox()
    const emptyMessage = await page.getByRole('status').boundingBox()
    expect(Math.abs(emptyMessage.y - header.y - header.height - 48)).toBeLessThanOrEqual(1)
    options.records = [record(1)]
    await page.reload()
    await expect(page.locator('tbody tr')).toHaveCount(1)
    const populatedFooter = await footer.boundingBox()
    expect(populatedFooter.y).toBeCloseTo(emptyFooter.y, 0)
    expect(await page.locator('main > section').evaluate(node => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1)
  })
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`history keeps existing responsive styling and accessible pagination at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await prepare(page, { records: Array.from({ length: 20 }, (_, index) => record(index + 1)) })
    await page.goto('/pharmacist/dispensed-medication')
    await expect(page.locator('tbody tr')).toHaveCount(7)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    expect(await page.locator('aside').evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(71, 90, 162)')
    if (viewport.width >= 1024) {
      const content = page.locator('main > section')
      expect(await content.evaluate(node => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1)
      await expect(page.getByRole('combobox', { name: 'Rows per page', exact: true })).toBeInViewport()
      await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeInViewport()
    } else {
      await page.getByRole('button', { name: 'Next page', exact: true }).scrollIntoViewIfNeeded()
      await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeInViewport()
    }
    await page.screenshot({ path: testInfo.outputPath(`dispensation-history-${viewport.width}.png`), fullPage: true })
  })
}
