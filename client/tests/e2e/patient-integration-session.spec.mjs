import { test, expect } from '@playwright/test'

const roles = ['admin', 'doctor', 'pharmacist', 'patient']
const expiry = Math.floor(Date.now() / 1000) + 600
const token = role => `test.${Buffer.from(JSON.stringify({ sub: `${role}-integration-fixture`, role, exp: expiry })).toString('base64url')}.test`
const storageKey = role => `medtrail${role[0].toUpperCase()}${role.slice(1)}Session`

for (const role of ['admin', 'doctor', 'pharmacist']) {
  for (const legacyPatient of [false, true]) {
    test(`${role} logout preserves and restores ${legacyPatient ? 'main-format' : 'dedicated-format'} Patient sessions`, async ({ page }) => {
      const sessions = Object.fromEntries(roles.map(value => [storageKey(value), JSON.stringify({ token: token(value), ...(value === 'admin' || value === 'patient' && legacyPatient ? { role: value } : {}) })]))
      await page.addInitScript(sessions => {
        if (sessionStorage.getItem('integrationFixtureSeeded')) return
        for (const [key, value] of Object.entries(sessions)) sessionStorage.setItem(key, value)
        sessionStorage.setItem('integrationFixtureSeeded', 'yes')
      }, sessions)
      const requests = []
      await page.route('**/api/**', async route => {
        const request = route.request(), path = new URL(request.url()).pathname
        requests.push(path)
        if (path === '/api/auth/profile') {
          const jwt = request.headers().authorization.slice('Bearer '.length)
          const role = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).role
          return route.fulfill({ json: { id: `${role}-integration-fixture`, role, name: `${role} integration fixture`, email: `${role}@example.test`, isEmailVerified: true, invitationStatus: 'accepted' } })
        }
        if (path === '/api/admin/dashboard') return route.fulfill({ json: { byRole: { doctor: 0, pharmacist: 0, patient: 0 } } })
        if (path === '/api/admin/users') return route.fulfill({ json: [] })
        if (path === '/api/doctor/dashboard') return route.fulfill({ json: { doctor: { id: 'doctor-integration-fixture', role: 'doctor' }, stats: { patients: 0, awaitingClarification: 0, prescriptions: 0 }, recentPatients: [], recentActivities: [] } })
        if (path === '/api/pharmacy/dashboard') return route.fulfill({ json: { pharmacist: { id: 'pharmacist-integration-fixture' }, stats: { awaitingClarification: 0, dispensed: 0 }, recentPrescriptions: [] } })
        return route.fulfill({ status: 500, json: { message: `Unexpected isolated request: ${path}` } })
      })
      await page.goto('/patient/dashboard')
      await expect(page.getByRole('heading', { name: 'Welcome, patient integration fixture', exact: true })).toBeVisible()
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Welcome, patient integration fixture', exact: true })).toBeVisible()
      await page.goto(`/${role}/dashboard`)
      await page.getByRole('heading', { level: 1 }).waitFor()
      await page.getByRole('button', { name: 'Log out', exact: true }).filter({ visible: true }).click()
      await page.getByRole('dialog', { name: 'LOG OUT', exact: true }).getByRole('button', { name: 'Yes, Log out', exact: true }).click()
      await expect(page).toHaveURL(role === 'admin' ? /\/login$/ : new RegExp(`/${role}/login$`))
      expect(await page.evaluate(key => sessionStorage.getItem(key), storageKey(role))).toBeNull()
      expect(await page.evaluate(key => sessionStorage.getItem(key), storageKey('patient'))).toBe(sessions[storageKey('patient')])
      await page.goto('/patient/dashboard')
      await expect(page.getByRole('heading', { name: 'Welcome, patient integration fixture', exact: true })).toBeVisible()
      expect(requests.some(path => path.startsWith('/api/patient/'))).toBe(false)
    })
  }
}

test('legacy generic Patient login entry uses the dedicated Patient flow', async ({ page }) => {
  const requests = []
  await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
  await page.addInitScript(() => {
    if (location.pathname === '/login') history.replaceState({ usr: { selectedRole: 'Patient' }, key: 'isolated-role-fixture', idx: 0 }, '')
  })
  await page.goto('/login')
  await expect(page).toHaveURL(/\/patient\/login$/)
  expect(requests).toEqual([])
})
