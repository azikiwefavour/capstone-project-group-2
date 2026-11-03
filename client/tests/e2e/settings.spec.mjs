import { test, expect } from '@playwright/test'

// Test-only sessions and API responses; no real credentials or password changes.
const roles = ['admin', 'doctor', 'pharmacist']
const keyFor = role => `medtrail${role[0].toUpperCase()}${role.slice(1)}Session`
const expiry = Math.floor(Date.now() / 1000) + 600
const tokenFor = role => `test.${Buffer.from(JSON.stringify({ sub: `${role}-fixture`, role, exp: expiry })).toString('base64url')}.test`

async function prepare(page, role, options = {}) {
  await page.addInitScript(roles => {
    for (const [key, value] of roles) sessionStorage.setItem(key, JSON.stringify(value))
  }, roles.map(value => [keyFor(value), { token: tokenFor(value), ...(value === 'admin' ? { role: value } : {}) }]))
  const requests = []
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    requests.push({ path, method: request.method(), authorization: request.headers().authorization })
    let data = []
    if (path === '/api/auth/profile') {
      if (options.gate) await options.gate
      data = { id: `${role}-fixture`, name: options.missing ? null : `${role} profile fixture`, email: options.missing ? null : `${role}@example.test`, role: options.wrongRole || role, isEmailVerified: true, invitationStatus: 'accepted' }
    } else if (path === '/api/admin/dashboard') data = { byRole: { doctor: 0, pharmacist: 0, patient: 0 } }
    else if (path === '/api/doctor/dashboard') data = { doctor: { id: 'doctor-fixture', role }, stats: { patients: 0, awaitingClarification: 0, prescriptions: 0 }, recentPatients: [], recentActivities: [] }
    else if (path === '/api/pharmacy/dashboard') data = { pharmacist: { id: 'pharmacist-fixture' }, stats: { awaitingClarification: 0, dispensed: 0 }, recentPrescriptions: [] }
    await route.fulfill({ json: data })
  })
  return requests
}

for (const role of roles) {
  for (const viewport of [{ width: 1440, height: 720 }, { width: 390, height: 667 }]) {
    test(`${role} Settings shows only its verified profile and never submits unsupported changes at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport)
      const requests = await prepare(page, role)
      await page.goto(`/${role}/dashboard`)
      const gear = page.getByRole('button', { name: 'Open settings', exact: true })
      await expect(gear).toBeEnabled()
      await page.waitForLoadState('networkidle')
      const count = requests.length
      await gear.click()
      const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText(`${role}@example.test`, { exact: true })).toBeVisible()
      await expect(dialog.getByLabel('Full Name', { exact: true })).toHaveValue(`${role} profile fixture`)
      await expect(dialog.getByLabel('Full Name', { exact: true })).toHaveAttribute('readonly', '')
      for (const other of roles.filter(value => value !== role)) await expect(dialog.getByText(`${other}@example.test`, { exact: true })).toHaveCount(0)
      const current = dialog.getByLabel('Current Password', { exact: true })
      const password = dialog.getByLabel('New Password', { exact: true })
      const confirm = dialog.getByLabel('Confirm New Password', { exact: true })
      for (const input of [current, password, confirm]) await expect(input).toHaveAttribute('type', 'password')
      await expect(dialog.getByRole('button', { name: 'Update Password', exact: true })).toBeDisabled()
      await current.fill('   ')
      await password.fill('short')
      await confirm.fill('different')
      await confirm.blur()
      await expect(dialog.getByText('Current password is required.', { exact: true })).toBeVisible()
      await expect(dialog.getByText('Passwords do not match.', { exact: true })).toBeVisible()
      await current.fill('CurrentFixture1!')
      await password.fill('NewFixture1!')
      await confirm.fill('NewFixture1!')
      await confirm.blur()
      await expect(dialog.getByRole('alert')).toHaveCount(0)
      await expect(dialog.getByRole('button', { name: 'Update Password', exact: true })).toBeDisabled()
      await expect(dialog.getByRole('status')).toContainText('Password changes from Settings are not available yet.')
      await page.keyboard.press('Enter')
      expect(requests.length).toBe(count)
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
      const bounds = await dialog.boundingBox()
      expect(bounds.x).toBeGreaterThanOrEqual(16)
      expect(bounds.y).toBeGreaterThanOrEqual(16)
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - 16)
      if (viewport.width >= 1024) {
        expect(bounds.width).toBe(520)
        expect(await dialog.evaluate(node => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1)
        await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport()
      }
      for (const input of [current, password, confirm]) {
        const { height } = await input.boundingBox()
        expect(height).toBeGreaterThanOrEqual(38)
        expect(height).toBeLessThanOrEqual(40)
      }
      await dialog.evaluate(node => { node.scrollTop = 0 })
      await page.screenshot({ path: testInfo.outputPath(`${role}-settings-${viewport.width}.png`) })
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(dialog).toHaveCount(0)
      await expect(gear).toBeFocused()
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
      await gear.click()
      for (const label of ['Current Password', 'New Password', 'Confirm New Password']) await expect(dialog.getByLabel(label, { exact: true })).toHaveValue('')
      await dialog.getByRole('button', { name: 'Close settings', exact: true }).click()
      await expect(dialog).toHaveCount(0)
      await gear.click()
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(page).toHaveURL(`/${role}/dashboard`)
      expect(requests.every(request => request.method === 'GET' && request.authorization === `Bearer ${tokenFor(role)}`)).toBe(true)
    })
  }

  test(`${role} Settings is available on existing dashboard subpages without clearing page work`, async ({ page }) => {
    await prepare(page, role)
    const paths = role === 'admin' ? ['/admin/users', '/admin/audit-log']
      : role === 'doctor' ? ['/doctor/patients', '/doctor/clarifications', '/doctor/patients/record-fixture', '/doctor/clarifications/record-fixture']
        : ['/pharmacist/verification-queue', '/pharmacist/clarifications', '/pharmacist/dispensed-medication', '/pharmacist/verification-queue/record-fixture', '/pharmacist/clarifications/record-fixture']
    for (const path of paths) {
      await page.goto(path)
      const search = page.getByRole('searchbox').first()
      const hasSearch = await search.count()
      if (hasSearch) await search.fill('Keep this search')
      await page.getByRole('button', { name: 'Open settings', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
      await expect(dialog.getByLabel('Full Name', { exact: true })).toHaveValue(`${role} profile fixture`)
      await dialog.getByRole('button', { name: 'Close settings', exact: true }).click()
      await expect(page).toHaveURL(path)
      if (hasSearch) await expect(search).toHaveValue('Keep this search')
    }
  })
}

test('missing profile fields remain unavailable and Settings waits for verified identity', async ({ page }) => {
  let release
  const options = { missing: true, gate: new Promise(resolve => { release = resolve }) }
  await prepare(page, 'pharmacist', options)
  await page.goto('/pharmacist/dashboard')
  const gear = page.getByRole('button', { name: 'Open settings', exact: true })
  await expect(gear).toBeDisabled()
  release()
  await expect(gear).toBeEnabled()
  await gear.click()
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
  await expect(dialog.getByText('Name unavailable', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Email unavailable', { exact: true })).toBeVisible()
  await expect(dialog.getByLabel('Full Name', { exact: true })).toHaveValue('')
})
