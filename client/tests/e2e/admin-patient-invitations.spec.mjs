import { test, expect } from '@playwright/test'

// Entire workflow uses context-wide API fixtures, including the new registration
// tab. Never send invitations or credentials to a real backend from this suite.
const email = 'patient-invitation@example.test'
const password = 'FixturePassword!123'
const expiresAt = Math.floor(Date.now() / 1000) + 600
const token = role => `test.${Buffer.from(JSON.stringify({ sub: `${role}-fixture`, role, exp: expiresAt })).toString('base64url')}.test`

async function adminInvitations(page, context, { status = 201, message = 'Invitation rejected', gate } = {}) {
  const invitations = [], registrations = []
  await page.addInitScript(jwt => sessionStorage.setItem('medtrailAdminSession', JSON.stringify({ token: jwt, role: 'admin' })), token('admin'))
  await context.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    if (path === '/api/auth/profile') {
      const role = request.headers().authorization === `Bearer ${token('patient')}` ? 'patient' : 'admin'
      return route.fulfill({ json: { id: `${role}-fixture`, role, name: 'Invitation test fixture', isEmailVerified: true, invitationStatus: 'accepted' } })
    }
    if (['/api/admin/users', '/api/admin/invited-users'].includes(path)) return route.fulfill({ json: [] })
    if (path === '/api/admin/invite-user') {
      const body = request.postDataJSON()
      invitations.push({ body, authorization: request.headers().authorization })
      if (gate) await gate
      return route.fulfill({ status, json: status >= 400 ? { message } : { invitationToken: 'isolated-invitation-fixture', frontendInviteUrl: 'http://wrong-frontend.example.test/accept-invite?token=isolated-invitation-fixture', user: { id: 'patient-fixture', role: body.role, invitationStatus: 'pending' } } })
    }
    if (path === '/api/auth/validate-invitation') return route.fulfill({ json: { valid: true, role: 'patient', name: 'Invitation test fixture', email } })
    if (path === '/api/auth/complete-registration') {
      registrations.push(request.postDataJSON())
      return route.fulfill({ json: { accessToken: token('patient'), user: { id: 'patient-fixture', role: 'patient', email } } })
    }
    return route.fulfill({ status: 500, json: { message: `Unexpected isolated request: ${path}` } })
  })
  await page.goto('/admin/users')
  await page.getByRole('button', { name: 'Add new user', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Add new user', exact: true })
  await dialog.getByLabel('Name', { exact: true }).fill('  Invitation test fixture  ')
  await dialog.getByLabel('Email address', { exact: true }).fill('Patient-Invitation@Example.Test')
  await dialog.getByLabel('Phone', { exact: true }).fill('08123456789')
  return { dialog, invitations, registrations }
}

for (const width of [375, 1440]) {
  test(`Patient invitation submits demographics and reaches password creation at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 929 })
    const { dialog, invitations, registrations } = await adminInvitations(page, context)
    await dialog.getByLabel('Role', { exact: true }).selectOption('Patient')
    const create = dialog.getByRole('button', { name: 'Create user', exact: true })
    await expect(create).toBeDisabled()
    await dialog.getByLabel('Gender', { exact: true }).selectOption('Female')
    await expect(create).toBeDisabled()
    await dialog.getByLabel('Age', { exact: true }).fill('34')
    await create.click()
    const link = page.getByRole('link', { name: 'Open Patient registration', exact: true })
    await expect(link).toBeVisible()
    expect(invitations).toEqual([{ body: { name: 'Invitation test fixture', email, phone: '+2348123456789', role: 'patient', gender: 'Female', age: 34 }, authorization: `Bearer ${token('admin')}` }])
    const invitationUrl = new URL(await link.getAttribute('href'))
    expect(invitationUrl.origin).toBe(new URL(page.url()).origin)
    expect(invitationUrl.pathname).toBe('/accept-invite')
    const nextTab = context.waitForEvent('page')
    await link.click()
    const patient = await nextTab
    await expect(patient).toHaveURL(/\/patient\/create-password\?token=isolated-invitation-fixture$/)
    await expect(patient.getByRole('form', { name: 'Patient create password form' })).toBeVisible()
    await patient.getByLabel('Password', { exact: true }).fill(password)
    await patient.getByLabel('Confirm Password', { exact: true }).fill(password)
    await patient.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(patient).toHaveURL(/\/patient\/dashboard$/)
    await expect(patient.getByRole('heading', { name: 'Welcome, Invitation test fixture' })).toBeVisible()
    expect(registrations).toEqual([{ token: 'isolated-invitation-fixture', password, confirmPassword: password }])
    expect(await page.evaluate(() => sessionStorage.getItem('medtrailAdminSession'))).not.toBeNull()
    const storage = await page.evaluate(() => JSON.stringify({ ...sessionStorage, ...localStorage }))
    expect(storage).not.toContain('isolated-invitation-fixture')
    expect(storage).not.toContain(password)
  })
}

for (const role of ['Doctor', 'Pharmacist']) {
  test(`${role} invitation payload and close-on-success behavior are unchanged`, async ({ page, context }) => {
    const { dialog, invitations } = await adminInvitations(page, context)
    await dialog.getByLabel('Role', { exact: true }).selectOption('Patient')
    await dialog.getByLabel('Gender', { exact: true }).selectOption('Male')
    await dialog.getByLabel('Age', { exact: true }).fill('20')
    await dialog.getByLabel('Role', { exact: true }).selectOption(role)
    await expect(dialog.getByLabel('Gender', { exact: true })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Create user', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    expect(invitations[0].body).toEqual({ name: 'Invitation test fixture', email, phone: '+2348123456789', role: role.toLowerCase() })
    await expect(page.getByRole('link', { name: 'Open Patient registration' })).toHaveCount(0)
  })
}

test('Patient validation, in-flight protection and API failures do not report false success', async ({ page, context }) => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  const { dialog, invitations } = await adminInvitations(page, context, { status: 409, message: 'Test email already exists', gate })
  await dialog.getByLabel('Role', { exact: true }).selectOption('Patient')
  await dialog.getByLabel('Gender', { exact: true }).selectOption('Male')
  const age = dialog.getByLabel('Age', { exact: true })
  await age.fill('9007199254740992')
  await expect(dialog.getByRole('button', { name: 'Create user', exact: true })).toBeDisabled()
  await age.fill('0')
  await dialog.getByRole('button', { name: 'Create user', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Sending invitation...' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Close add user modal' }).click()
  await expect(dialog).toBeVisible()
  release()
  await expect(dialog.getByRole('alert')).toContainText('Test email already exists')
  expect(invitations).toHaveLength(1)
  expect(invitations[0].body.age).toBe(0)
  await expect(page.getByRole('link', { name: 'Open Patient registration' })).toHaveCount(0)
})
