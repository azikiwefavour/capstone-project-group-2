import { test, expect } from '@playwright/test'

// Isolated backend-contract fixtures. These requests never reach a real database.
const id = '11111111-1111-4111-8111-111111111111'
const patientId = '22222222-2222-4222-8222-222222222222'
const token = `test.${Buffer.from(JSON.stringify({ sub: 'pharmacist-fixture', role: 'pharmacist', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`
const prescription = () => ({ id, patientId, patientName: 'Patient Fixture', medicationName: 'Medication fixture', dosage: '10 mg', frequency: 'Daily', duration: '7 days', reason: 'Indication fixture', doctorName: 'Doctor fixture', status: 'pending', createdAt: '2026-10-19T10:00:00Z' })
const notes = 'Please confirm the prescribed dose.'

async function prepare(page, options = {}) {
  options.record ??= prescription()
  const requests = []
  await page.addInitScript(token => sessionStorage.setItem('medtrailPharmacistSession', JSON.stringify({ token })), token)
  await page.route('**/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const body = request.method() === 'POST' ? request.postDataJSON() : undefined
    requests.push({ path: url.pathname, query: url.search, method: request.method(), authorization: request.headers().authorization, body })
    let status = 200, data
    if (url.pathname === '/api/auth/profile') data = { id: 'pharmacist-fixture', name: 'Verified pharmacist', role: 'pharmacist', isEmailVerified: true, invitationStatus: 'accepted' }
    else if (url.pathname === '/api/pharmacy/prescriptions' && request.method() === 'GET') {
      options.reads = (options.reads || 0) + 1
      if (options.offlineReads) return route.abort('connectionrefused')
      if (options.preflightChanged && options.reads > 1) options.record.status = 'awaiting_clarification'
      data = url.searchParams.get('status') === 'pending' && options.record.status !== 'pending' ? [] : [options.record]
    } else if (url.pathname === `/api/pharmacy/prescriptions/${id}/clarify` && request.method() === 'POST') {
      if (options.offlinePost) return route.abort('connectionrefused')
      if (options.postGate) await options.postGate
      status = options.postStatus || 200
      if (status === 200 || options.savedDespiteError) options.record = { ...options.record, status: 'awaiting_clarification', concern: body.concern, clarificationReason: body.reason }
      data = status === 200 ? { message: 'Clarification confirmed by backend.', prescription: options.record } : { message: 'Backend rejected the clarification.' }
      if (options.mismatched) data = { message: 'Not trustworthy', prescription: { ...options.record, id: 'other-prescription' } }
    } else { status = 500; data = { message: 'Unexpected API request in clarification test' } }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.goto(`/pharmacist/verification-queue/${id}`)
  await expect(page.getByRole('heading', { name: 'Patient Fixture', exact: true })).toBeVisible()
  return requests
}

async function open(page) {
  await page.getByRole('button', { name: 'Request clarification', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Request clarification', exact: true })
  await expect(dialog).toBeVisible()
  return dialog
}

async function fill(dialog) {
  await dialog.getByRole('radio', { name: 'Dose', exact: true }).check()
  await dialog.getByRole('textbox', { name: 'Notes', exact: true }).fill(notes)
}

test('clarification modal reuses the patient, supports exclusive concerns and a 200-character notes counter', async ({ page }) => {
  const requests = await prepare(page)
  const count = requests.length
  const dialog = await open(page)
  await expect(dialog.getByText('Choose what you would like the prescriber to confirm.', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Patient Fixture', { exact: true })).toBeVisible()
  await expect(dialog.getByText('PF', { exact: true })).toBeVisible()
  await expect(dialog).toContainText('Age unavailable')
  await expect(dialog).toContainText('Gender unavailable')
  await expect(dialog.getByRole('radio')).toHaveCount(5)
  for (const concern of ['Dose', 'Frequency', 'Duration', 'Possible duplicate', 'Other']) {
    await dialog.getByRole('radio', { name: concern, exact: true }).check()
    await expect(dialog.locator('input:checked')).toHaveCount(1)
  }
  const input = dialog.getByRole('textbox', { name: 'Notes', exact: true })
  await expect(input).toHaveAttribute('placeholder', 'Start typing...')
  await expect(input).toHaveAttribute('maxlength', '200')
  await expect(dialog.getByText('0/200', { exact: true })).toBeVisible()
  await input.fill('a'.repeat(200))
  await input.press('End')
  await input.press('b')
  await expect(input).toHaveValue('a'.repeat(200))
  await expect(dialog.getByText('200/200', { exact: true })).toBeVisible()
  expect(requests.length).toBe(count)
})

test('clarification validation blocks missing concern, whitespace, punctuation-only and short notes', async ({ page }) => {
  const requests = await prepare(page)
  const dialog = await open(page)
  const submit = dialog.getByRole('button', { name: 'Submit request', exact: true })
  await submit.click()
  await expect(dialog.getByText('Choose a concern.', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: 'Notes', exact: true })).toHaveAttribute('aria-invalid', 'true')
  await dialog.getByRole('radio', { name: 'Dose', exact: true }).check()
  for (const invalid of ['     ', 'short', '..........']) {
    await dialog.getByRole('textbox', { name: 'Notes', exact: true }).fill(invalid)
    await submit.click()
    await expect(dialog.getByText('Explain what needs clarification using at least 10 characters.', { exact: true })).toBeVisible()
  }
  await dialog.getByRole('textbox', { name: 'Notes', exact: true }).fill(notes)
  await dialog.getByRole('textbox', { name: 'Notes', exact: true }).press('Enter')
  expect(requests.some(request => request.method === 'POST')).toBe(false)
})

test('Back, X and Escape close without submitting and restore focus; verification still opens', async ({ page }) => {
  const requests = await prepare(page)
  for (const action of ['Back', 'X', 'Escape']) {
    const dialog = await open(page)
    await fill(dialog)
    if (action === 'Escape') await page.keyboard.press('Escape')
    else await dialog.getByRole('button', { name: action === 'Back' ? 'Back' : 'Close request clarification', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Request clarification', exact: true })).toBeFocused()
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  }
  expect(requests.some(request => request.method === 'POST')).toBe(false)
  await page.getByRole('button', { name: 'Verify prescription', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Verify prescription', exact: true }).getByRole('button', { name: 'Verify and dispense prescription', exact: true })).toBeDisabled()
})

test('an explicit submit waits for the backend, prevents duplicates and refreshes the prescription and queue', async ({ page }) => {
  let release
  const options = { postGate: new Promise(resolve => { release = resolve }) }
  const requests = await prepare(page, options)
  const dialog = await open(page)
  await fill(dialog)
  await dialog.getByRole('textbox', { name: 'Notes', exact: true }).fill(`  ${notes}  `)
  await dialog.getByRole('button', { name: 'Submit request', exact: true }).dblclick()
  await expect(dialog.getByRole('button', { name: 'Submitting...', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Back', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('textbox', { name: 'Notes', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await expect(page.getByText('Clarification confirmed by backend.', { exact: true })).toHaveCount(0)
  await expect.poll(() => requests.filter(request => request.method === 'POST').length).toBe(1)
  expect(requests.find(request => request.method === 'POST').body).toEqual({ concern: 'Dose', reason: notes })
  release()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Clarification confirmed by backend.', { exact: true })).toBeVisible()
  await expect(page.getByText('Clarification has already been requested for this prescription.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request clarification', exact: true })).toBeDisabled()
  expect(options.reads).toBeGreaterThanOrEqual(3)
  expect(requests.every(request => request.authorization === `Bearer ${token}`)).toBe(true)
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Queue', exact: true }).click()
  await expect(page.getByText('No prescriptions awaiting verification.', { exact: true })).toBeVisible()
})

test('backend validation errors retain notes for an explicit retry and never show early success', async ({ page }) => {
  const options = { postStatus: 400 }
  const requests = await prepare(page, options)
  const dialog = await open(page)
  await fill(dialog)
  await dialog.getByRole('button', { name: 'Submit request', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Backend rejected the clarification.')
  await expect(dialog.getByRole('textbox', { name: 'Notes', exact: true })).toHaveValue(notes)
  await expect(page.getByText('Clarification confirmed by backend.', { exact: true })).toHaveCount(0)
  options.postStatus = 200
  await dialog.getByRole('button', { name: 'Submit request', exact: true }).click()
  await expect(page.getByText('Clarification confirmed by backend.', { exact: true })).toBeVisible()
  expect(requests.filter(request => request.method === 'POST')).toHaveLength(2)
})

test('uncertain server failures block retries until a fresh read confirms the actual status', async ({ page }) => {
  const options = { postStatus: 503, savedDespiteError: true }
  const requests = await prepare(page, options)
  const dialog = await open(page)
  await fill(dialog)
  await dialog.getByRole('button', { name: 'Submit request', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('The request could not be confirmed.')
  await expect(dialog.getByRole('button', { name: 'Submit request', exact: true })).toBeDisabled()
  await expect(page.getByText('Clarification confirmed by backend.', { exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByText('Clarification has already been requested for this prescription.', { exact: true })).toBeVisible()
  expect(requests.filter(request => request.method === 'POST')).toHaveLength(1)
})

test('connection loss before clarification submission sends no write and verification remains disabled', async ({ page }) => {
  const options = {}
  const requests = await prepare(page, options)
  options.offlineReads = true
  const dialog = await open(page)
  await fill(dialog)
  await dialog.getByRole('button', { name: 'Submit request', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Unable to load your prescriptions.')
  await expect(dialog.getByRole('textbox', { name: 'Notes', exact: true })).toHaveValue(notes)
  await expect(dialog.getByRole('button', { name: 'Submit request', exact: true })).toBeEnabled()
  await expect(page.getByRole('status')).toHaveCount(0)
  expect(requests.some(request => request.method === 'POST')).toBe(false)
  await dialog.getByRole('button', { name: 'Back', exact: true }).click()
  const count = requests.length
  await page.getByRole('button', { name: 'Verify prescription', exact: true }).click()
  const verification = page.getByRole('dialog', { name: 'Verify prescription', exact: true })
  await expect(verification.getByRole('button', { name: 'Verify and dispense prescription', exact: true })).toBeDisabled()
  await expect(verification).toContainText('No changes will be submitted.')
  expect(requests.length).toBe(count)
})

test('connection loss during clarification submission never reports success or automatically retries', async ({ page }) => {
  const options = { offlinePost: true }
  const requests = await prepare(page, options)
  const dialog = await open(page)
  await fill(dialog)
  await dialog.getByRole('button', { name: 'Submit request', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('The request could not be confirmed.')
  await expect(dialog.getByRole('button', { name: 'Submit request', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('textbox', { name: 'Notes', exact: true })).toHaveValue(notes)
  await expect(page.getByRole('status')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Request clarification', exact: true })).toBeEnabled()
  expect(requests.filter(request => request.method === 'POST')).toHaveLength(1)
  expect(options.record.status).toBe('pending')
})

test('a changed prescription discovered before submission cannot be written', async ({ page }) => {
  const requests = await prepare(page, { preflightChanged: true })
  const dialog = await open(page)
  await fill(dialog)
  await dialog.getByRole('button', { name: 'Submit request', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('This prescription has changed or already has a clarification request.')
  expect(requests.some(request => request.method === 'POST')).toBe(false)
})

test('a clarification 401 clears the Pharmacist session and closes the modal', async ({ page }) => {
  await prepare(page, { postStatus: 401 })
  const dialog = await open(page)
  await fill(dialog)
  await dialog.getByRole('button', { name: 'Submit request', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  await expect(dialog).toHaveCount(0)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPharmacistSession'))).toBeNull()
})

for (const viewport of [{ width: 390, height: 600 }, { width: 1440, height: 900 }]) {
  test(`clarification modal remains scrollable and inside the viewport at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await prepare(page)
    const dialog = await open(page)
    await expect(dialog.getByText('0/200', { exact: true })).toBeVisible()
    const bounds = await dialog.boundingBox()
    expect(bounds.x).toBeGreaterThanOrEqual(16)
    expect(bounds.y).toBeGreaterThanOrEqual(16)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width - 16)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - 16)
    expect(await dialog.evaluate(node => node.scrollWidth)).toBeLessThanOrEqual(Math.ceil(bounds.width))
    await dialog.getByRole('button', { name: 'Submit request', exact: true }).scrollIntoViewIfNeeded()
    await expect(dialog.getByRole('button', { name: 'Back', exact: true })).toBeVisible()
    await dialog.evaluate(node => { node.scrollTop = 0 })
    await page.screenshot({ path: testInfo.outputPath(`pharmacist-clarification-${viewport.width}.png`), fullPage: true })
  })
}
