import { test, expect } from '@playwright/test'

// Isolated API fixtures; no real backend, email, account or database writes.
const token = `test.${Buffer.from(JSON.stringify({ sub: 'pharmacist-fixture', role: 'pharmacist', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`
const prescription = (id, values = {}) => ({ id, patientId: 'patient-1', patientName: 'Patient Fixture', medicationName: `Medication ${id}`, dosage: '10 mg', frequency: 'Once daily', duration: '7 days', reason: 'Indication from prescription', doctorName: 'Doctor fixture', status: 'pending', createdAt: '2026-10-19T10:00:00Z', ...values })
const records = () => [
  prescription('first'),
  prescription('second', { dosage: '20 mg', frequency: 'Twice daily', duration: '14 days', status: 'active' }),
  prescription('past', { status: 'dispensed' }),
  prescription('other-patient', { patientId: 'patient-2' }),
]

async function prepare(page, options = {}) {
  await page.addInitScript(token => sessionStorage.setItem('medtrailPharmacistSession', JSON.stringify({ token })), token)
  const requests = []
  await page.route('**/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    requests.push({ path: url.pathname, search: url.search, method: request.method(), authorization: request.headers().authorization })
    let status = 200, data
    if (url.pathname === '/api/auth/profile') {
      if (options.profileGate) await options.profileGate
      data = { id: 'pharmacist-fixture', name: 'Verified pharmacist', role: options.role || 'pharmacist', isEmailVerified: true, invitationStatus: 'accepted' }
    } else if (url.pathname === '/api/pharmacy/prescriptions') {
      if (url.searchParams.get('status') === 'all' && options.detailsGate) await options.detailsGate
      status = options.status || 200
      data = status === 200 ? options.records || records() : { message: 'Prescription service unavailable.' }
      if (status === 200 && url.searchParams.get('status') === 'pending') data = data.filter(record => record.status === 'pending')
    } else {
      status = 500
      data = { message: 'Unexpected API in read-only details test' }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
  })
  return requests
}

test('patient link opens the exact prescription, reuses profile and sidebar, and breadcrumb returns to Queue', async ({ page }) => {
  const requests = await prepare(page)
  await page.goto('/pharmacist/verification-queue')
  const row = page.locator('tbody tr').filter({ hasText: 'Medication first' })
  await row.getByRole('link', { name: 'Patient Fixture', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/verification-queue\/first$/)
  await expect(page.getByRole('heading', { name: 'Patient Fixture', exact: true })).toBeVisible()
  await expect(page.getByText('Welcome, Verified pharmacist', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Verification Queue', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).not.toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText('Queue>Patient Fixture')
  const profile = page.getByRole('region', { name: 'Patient profile' })
  await expect(profile.getByText('PF', { exact: true })).toBeVisible()
  await expect(profile).toContainText('Age unavailable')
  await expect(profile).toContainText('Gender unavailable')
  const information = page.getByRole('region', { name: 'Prescription information' })
  await expect(information.locator('dt')).toHaveText(['Prescribed by', 'Submitted on', 'Medication', 'Dose', 'Frequency', 'Duration', 'Reason'])
  await expect(information.locator('dd').nth(0)).toHaveText('Doctor fixture')
  await expect(information.locator('dd').nth(2)).toHaveText('Medication first')
  await expect(information.locator('dd').nth(3)).toHaveText('10 mg')
  await expect(information.locator('dd').nth(4)).toHaveText('Once daily')
  await expect(information.locator('dd').nth(5)).toHaveText('7 days')
  await expect(information.locator('dd').nth(6)).toHaveText('Indication from prescription')
  await expect(information.locator('time')).toHaveAttribute('datetime', '2026-10-19T10:00:00.000Z')
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Queue', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/verification-queue$/)
  await expect(page.getByRole('heading', { name: 'Verification queue', exact: true })).toBeVisible()
  expect(requests.every(request => request.method === 'GET' && request.authorization === `Bearer ${token}`)).toBe(true)
  expect(requests.every(request => ['/api/auth/profile', '/api/pharmacy/prescriptions'].includes(request.path))).toBe(true)
})

test('details reload from the permitted API; current medications exclude other patients and historical statuses', async ({ page }) => {
  const requests = await prepare(page)
  await page.goto('/pharmacist/verification-queue/second')
  const information = page.getByRole('region', { name: 'Prescription information' })
  await expect(information.locator('dd').nth(2)).toHaveText('Medication second')
  await expect(information.locator('dd').nth(3)).toHaveText('20 mg')
  const medications = page.getByRole('region', { name: 'Current medications' })
  await expect(medications.getByRole('columnheader')).toHaveText(['Medication', 'Dose and frequency', 'Duration', 'Prescribed by', 'Status', 'Date', 'Actions'])
  await expect(medications.locator('tbody tr')).toHaveCount(2)
  await expect(medications.getByText('Medication first', { exact: true })).toBeVisible()
  await expect(medications.getByText('Medication second', { exact: true })).toBeVisible()
  await expect(medications.getByText('Unverified', { exact: true })).toHaveCount(1)
  await expect(medications.getByText('Active', { exact: true })).toHaveCount(1)
  await expect(medications.getByText('Medication past', { exact: true })).toHaveCount(0)
  await expect(medications.getByText('Medication other-patient', { exact: true })).toHaveCount(0)
  const count = requests.filter(request => request.search === '?status=all').length
  await page.reload()
  await expect(information.locator('dd').nth(3)).toHaveText('20 mg')
  expect(requests.filter(request => request.search === '?status=all').length).toBeGreaterThan(count)
})

test('clarification modal is available; medication menu opens only read-only details', async ({ page }) => {
  const requests = await prepare(page)
  await page.goto('/pharmacist/verification-queue/first')
  await expect(page.getByRole('button', { name: 'Request clarification', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Verify prescription', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Medication actions for Medication second', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Open prescription', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/verification-queue\/second$/)
  await expect(page.getByRole('region', { name: 'Prescription information' }).locator('dd').nth(2)).toHaveText('Medication second')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(requests.every(request => request.method === 'GET')).toBe(true)
})

test('verification modal reuses the selected prescription data and cannot submit or fetch records', async ({ page }) => {
  const requests = await prepare(page)
  await page.goto('/pharmacist/verification-queue/second')
  const information = page.getByRole('region', { name: 'Prescription information' })
  await expect(information.locator('dd').nth(2)).toHaveText('Medication second')
  const values = await information.locator('dd').allTextContents()
  const count = requests.length
  await page.getByRole('button', { name: 'Verify prescription', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Verify prescription', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Verify prescription', exact: true })).toBeVisible()
  await expect(dialog.getByText('Be sure to review the prescription details before verification. Your name and time will be logged.', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Patient Fixture', { exact: true })).toBeVisible()
  await expect(dialog.getByText('PF', { exact: true })).toBeVisible()
  await expect(dialog).toContainText('Age unavailable')
  await expect(dialog).toContainText('Gender unavailable')
  await expect(dialog.locator('dd')).toHaveText(values)
  await expect(dialog.locator('dd').nth(3)).toHaveText('20 mg')
  await expect(dialog.locator('dd').nth(4)).toHaveText('Twice daily')
  await expect(dialog.getByRole('button', { name: 'Verify and dispense prescription', exact: true })).toBeDisabled()
  await expect(dialog).toContainText('The verification workflow must be confirmed before this action can be enabled.')
  expect(await dialog.evaluate(node => node.matches(':modal'))).toBe(true)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/pharmacist\/verification-queue\/second$/)
  expect(requests.length).toBe(count)
  expect(requests.every(request => request.method === 'GET')).toBe(true)
})

test('verification modal closes with X and Escape, restores focus and releases scroll locking', async ({ page }) => {
  await prepare(page)
  await page.goto('/pharmacist/verification-queue/first')
  const trigger = page.getByRole('button', { name: 'Verify prescription', exact: true })
  const overflow = await page.evaluate(() => [document.body.style.overflow, document.documentElement.style.overflow])
  for (const close of ['X', 'Escape']) {
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Verify prescription', exact: true })
    await expect(dialog).toBeVisible()
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
    if (close === 'X') await dialog.getByRole('button', { name: 'Close verify prescription', exact: true }).click()
    else await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
    expect(await page.evaluate(() => [document.body.style.overflow, document.documentElement.style.overflow])).toEqual(overflow)
  }
})

test('verification modal retains unavailable fields and is discarded when leaving prescription details', async ({ page }) => {
  await prepare(page, { records: [{ id: 'missing', status: 'pending' }] })
  await page.goto('/pharmacist/verification-queue')
  await page.getByRole('link', { name: 'Name unavailable', exact: true }).click()
  await page.getByRole('button', { name: 'Verify prescription', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Verify prescription', exact: true })
  await expect(dialog.getByText('Patient information unavailable', { exact: true })).toBeVisible()
  await expect(dialog.locator('dd')).toHaveText(Array(7).fill('—'))
  await expect(dialog.locator('time')).toHaveCount(0)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Verification queue', exact: true })).toBeVisible()
  await expect(dialog).toHaveCount(0)
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Patient information unavailable', exact: true })).toBeVisible()
  await expect(dialog).toHaveCount(0)
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
})

for (const viewport of [{ width: 390, height: 600 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`verification modal stays centered and scrollable at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await prepare(page)
    await page.goto('/pharmacist/verification-queue/first')
    await page.getByRole('button', { name: 'Verify prescription', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Verify prescription', exact: true })
    await expect(dialog).toBeVisible()
    const bounds = await dialog.boundingBox()
    expect(bounds.x).toBeGreaterThanOrEqual(16)
    expect(bounds.y).toBeGreaterThanOrEqual(16)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width - 16)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - 16)
    expect(Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1)
    expect(Math.abs(bounds.y + bounds.height / 2 - viewport.height / 2)).toBeLessThanOrEqual(1)
    expect(await dialog.evaluate(node => node.scrollWidth)).toBeLessThanOrEqual(Math.ceil(bounds.width))
    const confirm = dialog.getByRole('button', { name: 'Verify and dispense prescription', exact: true })
    await confirm.scrollIntoViewIfNeeded()
    await expect(confirm).toBeVisible()
    await dialog.evaluate(node => { node.scrollTop = 0 })
    await page.screenshot({ path: testInfo.outputPath(`pharmacist-verification-modal-${viewport.width}.png`), fullPage: true })
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  })
}

test('missing patient identity and prescription fields show unavailable states rather than fabricated information', async ({ page }) => {
  await prepare(page, { records: [{ id: 'missing', status: 'pending', date: '19 Oct 2026', doseAndFrequency: 'Combined value only' }] })
  await page.goto('/pharmacist/verification-queue/missing')
  await expect(page.getByRole('heading', { name: 'Patient information unavailable', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Prescription information' }).locator('dd')).toHaveText(Array(7).fill('—'))
  await expect(page.locator('time')).toHaveCount(0)
  await expect(page.getByText('Current medications are unavailable because the patient identity is missing.', { exact: true })).toBeVisible()
  await expect(page.getByText('No current medications available.', { exact: true })).toHaveCount(0)
})

test('a patient with no active or pending records has a genuine empty current medications state', async ({ page }) => {
  await prepare(page, { records: [prescription('completed', { status: 'completed' })] })
  await page.goto('/pharmacist/verification-queue/completed')
  await expect(page.getByText('No current medications available.', { exact: true })).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(0)
})

test('details wait for profile verification and show loading without exposing stale prescription data', async ({ page }) => {
  let releaseProfile, releaseDetails
  const profileGate = new Promise(resolve => { releaseProfile = resolve })
  const detailsGate = new Promise(resolve => { releaseDetails = resolve })
  const options = { profileGate, detailsGate }
  const requests = await prepare(page, options)
  await page.goto('/pharmacist/verification-queue/first')
  await expect(page.getByRole('status')).toHaveText('Checking your session...')
  expect(requests.some(request => request.path === '/api/pharmacy/prescriptions')).toBe(false)
  releaseProfile()
  await expect(page.getByRole('status')).toHaveText('Loading prescription...')
  await expect(page.getByRole('region', { name: 'Prescription information' })).toHaveCount(0)
  releaseDetails()
  await expect(page.getByRole('heading', { name: 'Patient Fixture', exact: true })).toBeVisible()
  let releaseNext
  options.detailsGate = new Promise(resolve => { releaseNext = resolve })
  await page.getByRole('button', { name: 'Medication actions for Medication second', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Open prescription', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Loading prescription...')
  await expect(page.getByRole('region', { name: 'Prescription information' })).toHaveCount(0)
  releaseNext()
  await expect(page.getByRole('region', { name: 'Prescription information' }).locator('dd').nth(2)).toHaveText('Medication second')
})

test('API errors support retry; an unknown prescription never displays another patient record', async ({ page }) => {
  const options = { status: 503 }
  await prepare(page, options)
  await page.goto('/pharmacist/verification-queue/first')
  await expect(page.getByRole('alert')).toContainText('Prescription service unavailable.')
  await expect(page.getByRole('region', { name: 'Patient profile' })).toHaveCount(0)
  options.status = 200
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Patient Fixture', exact: true })).toBeVisible()
  await page.goto('/pharmacist/verification-queue/not-in-this-hospital')
  await expect(page.getByRole('alert')).toContainText('This prescription is not available in your hospital records.')
  await expect(page.getByRole('region', { name: 'Patient profile' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Current medications' })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Queue', exact: true })).toHaveAttribute('href', '/pharmacist/verification-queue')
})

test('401 and logout preserve Pharmacist protection on direct details URLs', async ({ page }) => {
  const options = { status: 401 }
  await prepare(page, options)
  await page.goto('/pharmacist/verification-queue/first')
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  await expect(page.getByRole('region', { name: 'Patient profile' })).toHaveCount(0)
  options.status = 200
  await page.evaluate(token => sessionStorage.setItem('medtrailPharmacistSession', JSON.stringify({ token })), token)
  await page.goto('/pharmacist/verification-queue/first')
  await expect(page.getByRole('heading', { name: 'Patient Fixture', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await page.getByRole('dialog', { name: 'LOG OUT', exact: true }).getByRole('button', { name: 'Yes, Log out', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPharmacistSession'))).toBeNull()
})

test('unauthenticated details URLs and a rejected profile cannot load prescription records', async ({ page }) => {
  const requests = []
  await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
  await page.goto('/pharmacist/verification-queue/first')
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(requests).toHaveLength(0)
  await page.unroute('**/api/**')
  const authenticatedRequests = await prepare(page, { role: 'doctor' })
  await page.goto('/pharmacist/verification-queue/first')
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(authenticatedRequests.some(request => request.path === '/api/pharmacy/prescriptions')).toBe(false)
})

for (const width of [390, 1024, 1440]) {
  test(`details keep existing responsive dimensions at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await prepare(page)
    await page.goto('/pharmacist/verification-queue/first')
    await expect(page.getByRole('heading', { name: 'Patient Fixture', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    expect(await page.locator('aside').evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(71, 90, 162)')
    const profile = page.getByRole('region', { name: 'Patient profile' })
    expect(await profile.evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(238, 240, 255)')
    await page.screenshot({ path: testInfo.outputPath(`pharmacist-prescription-details-${width}.png`), fullPage: true })
  })
}
