import { test, expect } from '@playwright/test'

// Contract fixtures remain in tests. No live backend or database is contacted.
const token = `test.${Buffer.from(JSON.stringify({ sub: 'pharmacist-fixture', role: 'pharmacist', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`
const rx = (id, values = {}) => ({ id, patientId: 'patient-1', patientName: 'Patient Fixture', medicationName: `Medication ${id}`, dosage: '10 mg', frequency: 'Daily', duration: '7 days', reason: 'Indication fixture', doctorName: 'Dr. Prescriber Fixture', status: 'pending', createdAt: '2026-10-19T10:00:00Z', ...values })
const records = () => [
  rx('waiting', { status: 'awaiting_clarification', concern: 'Dose', clarificationReason: 'Please confirm the dose for this patient.' }),
  rx('reply', { status: 'clarified', concern: 'Frequency', clarificationReason: 'Please confirm the prescribed frequency.', clarificationResponse: 'Confirmed twice daily after review.' }),
  rx('current', { status: 'active' }),
  rx('other-patient', { patientId: 'patient-2', status: 'active' }),
  rx('ordinary', { patientId: 'patient-2' }),
]

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
      data = { id: 'pharmacist-fixture', name: 'Verified pharmacist', role: 'pharmacist', isEmailVerified: true, invitationStatus: 'accepted' }
    } else if (url.pathname === '/api/pharmacy/prescriptions' && request.method() === 'GET') {
      if (options.recordsGate) await options.recordsGate
      status = options.status || 200
      data = status === 200 ? options.records || records() : { message: 'Clarifications temporarily unavailable.' }
    } else { status = 500; data = { message: 'Unexpected API request in clarification details test' } }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
  })
  return requests
}

test('Clarifications sidebar and patient link open the specific request using the existing details layout', async ({ page }) => {
  const requests = await prepare(page)
  await page.goto('/pharmacist/verification-queue')
  await page.getByRole('link', { name: 'Clarifications', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/clarifications$/)
  await expect(page.getByRole('heading', { name: 'Clarifications', exact: true })).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await page.locator('tbody tr').filter({ hasText: 'Medication waiting' }).getByRole('link', { name: 'Patient Fixture', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/clarifications\/waiting$/)
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText('Clarifications>Patient Fixture')
  await expect(page.getByText('Welcome, Verified pharmacist', { exact: true })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Pharmacist navigation' }).getByRole('link', { name: 'Clarifications', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: 'Verification Queue', exact: true })).not.toHaveAttribute('aria-current', 'page')
  const profile = page.getByRole('region', { name: 'Patient profile' })
  await expect(profile.getByText('PF', { exact: true })).toBeVisible()
  await expect(profile).toContainText('Age unavailable')
  await expect(profile).toContainText('Gender unavailable')
  await expect(page.getByRole('region', { name: 'Prescription information' }).locator('dd').nth(2)).toHaveText('Medication waiting')
  const banner = page.getByRole('region', { name: 'Clarification status', exact: true })
  await expect(banner.getByRole('heading', { name: 'Pending clarification', exact: true })).toBeVisible()
  await expect(banner).toContainText('Concern: Dose')
  await expect(banner).toContainText('Please confirm the dose for this patient.')
  await expect(banner).toContainText('Waiting for Dr. Prescriber Fixture to respond.')
  await expect(banner.locator('svg')).toHaveCount(2)
  expect(await banner.evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(250, 115, 25)')
  const medications = page.getByRole('region', { name: 'Current medications' })
  await expect(medications.locator('tbody tr')).toHaveCount(1)
  await expect(medications).toContainText('Medication current')
  await expect(medications.getByText('Medication other-patient', { exact: true })).toHaveCount(0)
  expect((await banner.boundingBox()).y).toBeLessThan((await medications.boundingBox()).y)
  await expect(page.getByRole('button', { name: 'Request clarification', exact: true })).toHaveCount(0)
  expect(requests.every(request => request.method === 'GET' && request.authorization === `Bearer ${token}`)).toBe(true)
  expect(requests.every(request => ['/api/auth/profile', '/api/pharmacy/prescriptions'].includes(request.path))).toBe(true)
})

test('dismissing the banner only hides it locally; reload preserves the backend request and restores the banner', async ({ page }) => {
  const options = { records: records() }
  const requests = await prepare(page, options)
  await page.goto('/pharmacist/clarifications/waiting')
  const dismiss = page.getByRole('button', { name: 'Dismiss clarification status', exact: true })
  await expect(dismiss).toBeVisible()
  const count = requests.length
  await dismiss.click()
  await expect(page.getByRole('region', { name: 'Clarification status', exact: true })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Prescription information' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Current medications' })).toBeVisible()
  expect(requests.length).toBe(count)
  expect(options.records[0].status).toBe('awaiting_clarification')
  await page.reload()
  await expect(dismiss).toBeVisible()
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Clarifications', exact: true }).click()
  await expect(page.locator('tbody tr').filter({ hasText: 'Medication waiting' })).toContainText('Pending clarification')
  expect(requests.every(request => request.method === 'GET')).toBe(true)
})

test('another request for the same patient shows its actual response and does not claim it is still pending', async ({ page }) => {
  await prepare(page)
  await page.goto('/pharmacist/clarifications')
  await page.locator('tbody tr').filter({ hasText: 'Medication reply' }).getByRole('link', { name: 'Patient Fixture', exact: true }).click()
  const banner = page.getByRole('region', { name: 'Clarification status', exact: true })
  await expect(banner.getByRole('heading', { name: 'Clarified', exact: true })).toBeVisible()
  await expect(banner).toContainText('Frequency')
  await expect(banner).toContainText('Confirmed twice daily after review.')
  await expect(banner).not.toContainText('Waiting for')
  await expect(page.getByRole('region', { name: 'Prescription information' }).locator('dd').nth(2)).toHaveText('Medication reply')
})

test('a newly returned doctor response is shown after refresh, including after dispensing', async ({ page }) => {
  const options = { records: records() }
  await prepare(page, options)
  await page.goto('/pharmacist/clarifications/waiting')
  await expect(page.getByRole('heading', { name: 'Pending clarification', exact: true })).toBeVisible()
  options.records[0] = { ...options.records[0], status: 'dispensed', clarificationResponse: 'Actual response retained after dispensing.' }
  await page.reload()
  const banner = page.getByRole('region', { name: 'Clarification status', exact: true })
  await expect(banner.getByRole('heading', { name: 'Dispensed', exact: true })).toBeVisible()
  await expect(banner).toContainText('Actual response retained after dispensing.')
  await expect(banner).not.toContainText('Waiting for')
})

test('missing concern, notes, doctor and response stay unavailable rather than using sample values', async ({ page }) => {
  const options = { records: [{ id: 'missing', status: 'awaiting_clarification' }] }
  await prepare(page, options)
  await page.goto('/pharmacist/clarifications/missing')
  const banner = page.getByRole('region', { name: 'Clarification status', exact: true })
  await expect(banner).toContainText('Concern unavailable')
  await expect(banner).toContainText('Clarification notes unavailable')
  await expect(banner).toContainText('Waiting for the prescriber to respond.')
  await expect(page.getByRole('heading', { name: 'Patient information unavailable', exact: true })).toBeVisible()
  await expect(page.getByText('Current medications are unavailable because the patient identity is missing.', { exact: true })).toBeVisible()
  options.records[0].status = 'clarified'
  await page.reload()
  await expect(banner).toContainText('Prescriber response unavailable.')
  await expect(banner.getByRole('heading', { name: 'Clarified', exact: true })).toBeVisible()
})

test('list loading, empty and error/retry states remain distinct', async ({ page }) => {
  let releaseProfile, releaseRecords
  const options = { records: [], profileGate: new Promise(resolve => { releaseProfile = resolve }), recordsGate: new Promise(resolve => { releaseRecords = resolve }) }
  const requests = await prepare(page, options)
  await page.goto('/pharmacist/clarifications')
  await expect(page.getByRole('status')).toHaveText('Checking your session...')
  expect(requests.some(request => request.path === '/api/pharmacy/prescriptions')).toBe(false)
  releaseProfile()
  await expect(page.getByRole('status')).toHaveText('Loading clarifications...')
  releaseRecords()
  await expect(page.getByRole('status')).toHaveText('No clarification requests available.')
  options.status = 503
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Clarifications temporarily unavailable.')
  await expect(page.getByText('No clarification requests available.', { exact: true })).toHaveCount(0)
  options.status = 200
  options.records = records()
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(2)
})

test('details loading, unavailable requests, and errors never show the wrong patient', async ({ page }) => {
  let release
  const options = { recordsGate: new Promise(resolve => { release = resolve }) }
  await prepare(page, options)
  await page.goto('/pharmacist/clarifications/waiting')
  await expect(page.getByRole('status')).toHaveText('Loading clarification...')
  await expect(page.getByRole('region', { name: 'Patient profile' })).toHaveCount(0)
  release()
  await expect(page.getByRole('heading', { name: 'Patient Fixture', exact: true })).toBeVisible()
  await page.goto('/pharmacist/clarifications/ordinary')
  await expect(page.getByRole('alert')).toContainText('No clarification request is available')
  await expect(page.getByRole('region', { name: 'Patient profile' })).toHaveCount(0)
  options.status = 503
  await page.goto('/pharmacist/clarifications/waiting')
  await expect(page.getByRole('alert')).toContainText('Clarifications temporarily unavailable.')
  options.status = 200
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Patient Fixture', exact: true })).toBeVisible()
})

test('direct clarification URLs remain protected, and logout removes access', async ({ page }) => {
  const options = { status: 401 }
  await prepare(page, options)
  await page.goto('/pharmacist/clarifications/waiting')
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  options.status = 200
  await page.goto('/pharmacist/clarifications/waiting')
  await expect(page.getByRole('heading', { name: 'Patient Fixture', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await page.getByRole('dialog', { name: 'LOG OUT', exact: true }).getByRole('button', { name: 'Yes, Log out', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPharmacistSession'))).toBeNull()
})

for (const width of [390, 1440]) {
  test(`clarification list and details preserve responsive styling at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const data = records()
    const fullNotes = 'Please confirm the prescribed dose against the current medications. '.repeat(8)
    data[0].clarificationReason = fullNotes
    await prepare(page, { records: data })
    await page.goto('/pharmacist/clarifications')
    await expect(page.locator('tbody tr')).toHaveCount(2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.goto('/pharmacist/clarifications/waiting')
    await expect(page.getByRole('region', { name: 'Clarification status', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    expect(await page.locator('aside').evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(71, 90, 162)')
    const banner = page.getByRole('region', { name: 'Clarification status', exact: true })
    const bounds = await banner.boundingBox()
    await expect(banner.getByRole('button', { name: 'Dismiss clarification status', exact: true })).toBeVisible()
    if (width >= 1024) {
      expect(bounds.height).toBe(44)
      expect(bounds.width).toBe((await page.getByRole('region', { name: 'Prescription information' }).boundingBox()).width)
      const styles = await banner.evaluate(node => {
        const css = getComputedStyle(node)
        return { color: css.color, radius: css.borderRadius, padding: css.padding, gap: css.gap, wrap: css.flexWrap }
      })
      expect(styles).toEqual({ color: 'rgb(255, 255, 255)', radius: '10px', padding: '12px 48px', gap: '12px', wrap: 'nowrap' })
      const preview = banner.locator('p').first()
      expect(await preview.evaluate(node => getComputedStyle(node).textOverflow)).toBe('ellipsis')
      expect(await preview.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true)
      expect(await banner.locator('p').nth(1).evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true)
      const centers = await banner.evaluate(node => Array.from(node.children, child => { const rect = child.getBoundingClientRect(); return rect.top + rect.height / 2 }))
      expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(1)
    }
    await expect(page.getByText('Full clarification notes', { exact: true })).toHaveCount(0)
    await expect(page.locator('details, summary')).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath(`pharmacist-clarification-details-${width}.png`), fullPage: true })
  })
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
  test(`clarification details fit ${viewport.width}x${viewport.height} without desktop vertical scrolling`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const count = viewport.height === 720 ? 3 : 4
    const data = [records()[0], ...Array.from({ length: count }, (_, index) => rx(`current-${index}`, { status: 'active' }))]
    await prepare(page, { records: data })
    await page.goto('/pharmacist/clarifications/waiting')
    await expect(page.getByRole('region', { name: 'Current medications' }).locator('tbody tr')).toHaveCount(count)
    const mainContent = page.locator('main > section')
    expect(await mainContent.evaluate(node => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1)
    expect(await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBeLessThanOrEqual(1)
    const table = page.getByRole('region', { name: 'Current medications' })
    expect((await table.boundingBox()).y + (await table.boundingBox()).height).toBeLessThanOrEqual(viewport.height)
    expect(await table.locator('div').evaluateAll(nodes => nodes.some(node => node.scrollHeight > node.clientHeight + 1 && ['auto', 'scroll', 'hidden'].includes(getComputedStyle(node).overflowY)))).toBe(false)
    const banner = page.getByRole('region', { name: 'Clarification status', exact: true })
    expect((await banner.boundingBox()).height).toBe(44)
    expect(await banner.evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(250, 115, 25)')
    await page.screenshot({ path: testInfo.outputPath(`clarification-fit-${viewport.width}x${viewport.height}.png`), fullPage: true })
  })
}

test('small screens and large medication lists keep all records reachable with normal page scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 })
  await prepare(page, { records: [records()[0], ...Array.from({ length: 8 }, (_, index) => rx(`current-${index}`, { status: 'active' }))] })
  await page.goto('/pharmacist/clarifications/waiting')
  const rows = page.getByRole('region', { name: 'Current medications' }).locator('tbody tr')
  await expect(rows).toHaveCount(8)
  expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true)
  await rows.last().scrollIntoViewIfNeeded()
  await expect(rows.last()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})
