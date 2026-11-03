import { test, expect } from '@playwright/test'

// Isolated browser fixtures only: no real login or backend mutations.
const roles = ['admin', 'doctor', 'pharmacist']
const keyFor = role => `medtrail${role[0].toUpperCase()}${role.slice(1)}Session`
const tokenFor = role => `test.${Buffer.from(JSON.stringify({ sub: `${role}-fixture`, role, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`

async function prepare(page, role) {
  const sessions = Object.fromEntries(roles.map(value => [keyFor(value), JSON.stringify({ token: tokenFor(value), ...(value === 'admin' ? { role: 'admin' } : {}) })]))
  // Seed once so reloading after logout cannot recreate the removed session.
  await page.addInitScript(sessions => {
    if (sessionStorage.getItem('logoutFixtureReady')) return
    for (const [key, value] of Object.entries(sessions)) sessionStorage.setItem(key, value)
    sessionStorage.setItem('logoutFixtureReady', 'true')
  }, sessions)
  const requests = []
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    requests.push({ path, method: request.method() })
    let data
    if (path === '/api/auth/profile') data = { id: `${role}-fixture`, name: 'Verified user', role, isEmailVerified: true, invitationStatus: 'accepted' }
    else if (path === '/api/admin/dashboard') data = { byRole: { doctor: 0, pharmacist: 0, patient: 0 } }
    else if (path === '/api/admin/users') data = []
    else if (path === '/api/doctor/dashboard') data = { doctor: { id: 'doctor-fixture', role }, stats: { patients: 0, awaitingClarification: 0, prescriptions: 0 }, recentPatients: [], recentActivities: [] }
    else if (path === '/api/pharmacy/dashboard') data = { pharmacist: { id: 'pharmacist-fixture' }, stats: { awaitingClarification: 0, dispensed: 0 }, recentPrescriptions: [] }
    else throw new Error(`Unexpected logout test request: ${request.method()} ${path}`)
    await route.fulfill({ json: data })
  })
  return { sessions, requests }
}

for (const role of roles) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`${role} confirms logout without affecting other sessions at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport)
      const { sessions, requests } = await prepare(page, role)
      const dashboard = `/${role}/dashboard`
      await page.goto(dashboard)
      await expect(page.getByText(/Welcome, (Dr )?Verified user/, { exact: true })).toBeVisible()
      const logout = page.getByRole('button', { name: 'Log out', exact: true }).filter({ visible: true })
      const dialog = page.getByRole('dialog', { name: 'LOG OUT', exact: true })
      const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true })
      const confirm = dialog.getByRole('button', { name: 'Yes, Log out', exact: true })

      await logout.click()
      await expect(dialog).toBeVisible()
      await expect(dialog).toHaveAttribute('aria-modal', 'true')
      await expect(dialog).toContainText('Are you sure you want to log out of your account')
      await expect(cancel).toBeFocused()
      await expect(page).toHaveURL(dashboard)
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
      expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden')
      for (const [key, value] of Object.entries(sessions)) expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBe(value)

      // Keyboard focus stays inside the dialog and background controls stay inert.
      for (let index = 0; index < 5; index += 1) {
        await page.keyboard.press('Tab')
        expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true)
      }
      for (let index = 0; index < 5; index += 1) {
        await page.keyboard.press('Shift+Tab')
        expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true)
      }
      const scrollPosition = await page.evaluate(() => [window.scrollY, document.querySelector('main > section').scrollTop])
      await page.mouse.move(viewport.width - 8, viewport.height - 40)
      await page.mouse.wheel(0, 600)
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      expect(await page.evaluate(() => [window.scrollY, document.querySelector('main > section').scrollTop])).toEqual(scrollPosition)
      const bounds = await dialog.boundingBox()
      expect(bounds.x).toBeGreaterThanOrEqual(16)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width - 16)
      expect(Math.abs(bounds.y + bounds.height / 2 - viewport.height / 2)).toBeLessThanOrEqual(1)
      expect(await confirm.evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(92, 114, 201)')
      const cancelBounds = await cancel.boundingBox()
      const confirmBounds = await confirm.boundingBox()
      expect(cancelBounds.x + cancelBounds.width).toBeLessThan(confirmBounds.x)
      expect(cancelBounds.y).toBe(confirmBounds.y)
      await page.screenshot({ path: testInfo.outputPath(`${role}-logout-${viewport.width}.png`), fullPage: true })

      await cancel.click()
      await expect(dialog).toHaveCount(0)
      await expect(logout).toBeFocused()
      await expect(page).toHaveURL(dashboard)
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
      expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
      await logout.click()
      await dialog.getByRole('button', { name: 'Close log out confirmation', exact: true }).click()
      await expect(dialog).toHaveCount(0)
      await expect(page).toHaveURL(dashboard)
      await logout.click()
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(logout).toBeFocused()
      expect(await page.evaluate(key => sessionStorage.getItem(key), keyFor(role))).toBe(sessions[keyFor(role)])

      await logout.click()
      await confirm.click()
      const login = role === 'admin' ? '/login' : `/${role}/login`
      await expect(page).toHaveURL(login)
      await expect(dialog).toHaveCount(0)
      expect(await page.evaluate(key => sessionStorage.getItem(key), keyFor(role))).toBeNull()
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
      expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
      for (const other of roles.filter(value => value !== role)) expect(await page.evaluate(key => sessionStorage.getItem(key), keyFor(other))).toBe(sessions[keyFor(other)])
      if (role === 'admin') expect(await page.evaluate(() => history.state.usr.selectedRole)).toBe('Admin')
      await page.goto(dashboard)
      await expect(page).toHaveURL(login)
      expect(requests.every(request => request.method === 'GET')).toBe(true)
    })
  }
}
