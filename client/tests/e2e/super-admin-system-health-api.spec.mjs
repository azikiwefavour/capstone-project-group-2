import { test, expect } from '@playwright/test'

const jwt = role => `test.${Buffer.from(JSON.stringify({ sub: role === 'super_admin' ? 'health-test' : 'other-admin', role, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
const token = jwt('super_admin'), adminSession = JSON.stringify({ role: 'admin', token: jwt('admin') })
const ping = () => ({ status: 'UP', uptime: 12345, timestamp: new Date().toISOString() })
async function prepare(page, handler) {
  const calls = []
  await page.addInitScript(({ token, adminSession }) => {
    sessionStorage.setItem('medtrailSuperAdminSession', JSON.stringify({ token }))
    sessionStorage.setItem('medtrailAdminSession', adminSession)
  }, { token, adminSession })
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url())
    expect(route.request().method()).toBe('GET')
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`)
    if (url.pathname === '/api/auth/profile') return route.fulfill({ json: { id: 'health-test', role: 'super_admin', isEmailVerified: true } })
    // Fail immediately if a seed-capable, diagnostic, incident-insert or external
    // integration operation is accidentally introduced into live-page reads.
    expect(url.pathname).toBe('/api/super-admin/health-check')
    calls.push(url)
    return handler(route, url)
  })
  return calls
}

for (const width of [375, 1024, 1280, 1440]) test(`safe API liveness and unavailable monitoring retain desktop/mobile fit at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  const calls = await prepare(page, route => route.fulfill({ json: ping() }))
  await page.goto('/super-admin/system-health')
  const platform = page.locator('[data-system-health-platform]'), row = platform.locator('tbody tr')
  await expect(row).toHaveCount(1)
  await expect(row).toContainText('Medtrail API')
  await expect(row).toContainText('Current API liveness')
  await expect(row.getByRole('cell').last()).toHaveText('Up')
  for (const index of [0, 1]) await expect(row.getByRole('cell').nth(index)).toHaveText('Not available')
  await expect(platform.getByText('Current check', { exact: true })).toBeVisible()
  const cards = page.getByRole('region', { name: 'System Health summary', exact: true })
  await expect(cards.getByText('—', { exact: true })).toHaveCount(8)
  await expect(page.locator('[data-system-health-incidents]').getByText('No incident data available yet.', { exact: true })).toBeVisible()
  await expect(page.locator('[data-system-health-incidents]').getByText('Period unavailable', { exact: true })).toBeVisible()
  await expect(page.locator('[data-system-health-status]')).toHaveText('System health status is not available yet.')
  await expect(page.locator('[data-system-health-status]')).toHaveCSS('background-color', 'rgb(246, 247, 251)')
  const button = page.getByRole('button', { name: 'Run checks now', exact: true })
  await expect(button).toBeDisabled()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('SMS Delays')
  await expect(page.locator('body')).not.toContainText('99.98%')
  const initialCalls = calls.length
  await platform.getByRole('combobox').selectOption('operational')
  await expect(platform).toContainText('No services match this status.')
  await platform.getByRole('combobox').selectOption('all')
  await expect(row).toContainText('Up')
  expect(calls).toHaveLength(initialCalls)
  const content = page.getByRole('region', { name: 'System Health content', exact: true })
  if (width >= 1024) expect(await content.evaluate(node => node.scrollHeight <= node.clientHeight)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('liveness loading/network/schema error/retry/no-content keep monitoring and incident values neutral', async ({ page }) => {
  let mode = 'loading', release
  const gate = new Promise(resolve => { release = resolve })
  await prepare(page, async route => {
    if (mode === 'loading') { await gate; return route.abort() }
    if (mode === 'malformed') return route.fulfill({ json: {} })
    return route.fulfill({ status: 204, body: '' })
  })
  await page.goto('/super-admin/system-health')
  await expect(page.getByText('Loading monitoring data...', { exact: true })).toBeVisible()
  await expect(page.getByText('Loading incident data...', { exact: true })).toBeVisible()
  release()
  const alert = page.locator('[data-system-health-status]')
  await expect(alert).toContainText('Unable to connect.')
  mode = 'malformed'
  await alert.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(alert).toContainText('unexpected health-check response')
  mode = 'empty'
  await alert.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByText('No monitoring data available yet.', { exact: true })).toBeVisible()
  await expect(page.getByText('No incident data available yet.', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'System Health summary' }).getByText('—', { exact: true })).toHaveCount(8)
  await expect(page.getByRole('button', { name: 'Run checks now', exact: true })).toBeDisabled()
})

for (const status of [401, 403]) test(`health read HTTP ${status} invalidates only Super Admin session`, async ({ page }) => {
  await prepare(page, route => route.fulfill({ status, json: { message: 'private-backend-error' } }))
  await page.goto('/super-admin/system-health')
  await expect(page).toHaveURL(/\/super-admin\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailSuperAdminSession'))).toBeNull()
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailAdminSession'))).toBe(adminSession)
  await expect(page.locator('body')).not.toContainText('private-backend-error')
})

test('safe ping polls once a minute and recovers from errors without diagnostic/seeding endpoints', async ({ page }) => {
  await page.clock.install()
  let mode = 'ready'
  const calls = await prepare(page, route => mode === 'ready' ? route.fulfill({ json: ping() }) : route.fulfill({ status: 500, json: { message: 'private-error' } }))
  await page.goto('/super-admin/system-health')
  await expect(page.getByText('Current API liveness', { exact: true })).toBeVisible()
  const initialCalls = calls.length
  await page.clock.fastForward(60001)
  await expect.poll(() => calls.length).toBe(initialCalls + 1)
  mode = 'error'
  await page.clock.fastForward(60001)
  await expect(page.locator('[data-system-health-status]')).toContainText('Unable to load System Health.')
  await expect(page.locator('body')).not.toContainText('private-error')
  await expect(page.getByText('Current API liveness', { exact: true })).toHaveCount(0)
  mode = 'ready'
  await page.locator('[data-system-health-status]').getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByText('Current API liveness', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Run checks now', exact: true })).toBeDisabled()
})

test('leaving health page cancels liveness polling and stale reads', async ({ page }) => {
  await page.clock.install()
  let release
  const gate = new Promise(resolve => { release = resolve })
  const calls = await prepare(page, async route => { await gate; return route.fulfill({ json: ping() }).catch(() => {}) })
  await page.goto('/super-admin/system-health')
  await expect(page.getByText('Loading monitoring data...', { exact: true })).toBeVisible()
  await page.goto('/super-admin/preview/system-health')
  const countAfterNavigation = calls.length
  release()
  await page.clock.fastForward(120001)
  await expect(page.getByText('Current API liveness', { exact: true })).toHaveCount(0)
  expect(calls).toHaveLength(countAfterNavigation)
})

test('combined contract adapter renders measured DB sample and real incident identity without fabricated metrics or phases', async ({ page }) => {
  const requests = []
  await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
  await page.goto('/super-admin/preview/system-health')
  await page.evaluate(async () => {
    const [{ default: React }, { default: ReactDOM }, { default: Harness }, { mapSystemHealthOverview }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/tests/fixtures/SystemHealthHarness.jsx'), import('/src/super-admin/systemHealthResponse.js'),
    ])
    document.getElementById('root').hidden = true
    const node = document.createElement('div'); node.dataset.testid = 'combined-health-contract'; document.body.append(node)
    const root = ReactDOM.createRoot(node)
    const state = mapSystemHealthOverview({ platform: [
      { id: 'database', name: 'Database', reference: 'Primary database reference', latencyMs: 21, status: 'degraded', uptimePercent: 99.99 },
      { id: 'termii-sms', name: 'Termii SMS', latencyMs: 2.9, status: 'degraded', uptimePercent: 99.21 },
    ], summary: { apiUptime30Days: { uptime: 99.98 } }, incidents: { month: 'October 2026', items: [{ id: 'isolated', title: 'Repository incident title', serviceName: 'Isolated service name', rawTime: '2099-11-02T12:00:00Z', status: 'Investigating' }] } })
    root.render(React.createElement(Harness, { state }))
  })
  const host = page.getByTestId('combined-health-contract')
  const database = host.getByRole('row', { name: /Primary database reference/ })
  await expect(database).toContainText('21 ms')
  await expect(database).toContainText('Degraded')
  await expect(host.getByRole('row', { name: /Termii SMS/ })).toContainText('Unavailable')
  await expect(host.getByRole('article', { name: 'Open incidents', exact: true }).locator('p').first()).toHaveText('1')
  const incidents = host.locator('[data-system-health-incidents]')
  await expect(incidents).toContainText('Repository incident title')
  await expect(incidents).toContainText('Service: Isolated service name')
  await expect(incidents).toContainText('02 Nov 2099, 12:00 UTC')
  await expect(incidents).toContainText('Period unavailable')
  await expect(incidents).toContainText('Unavailable')
  await expect(incidents).not.toContainText('Investigating')
  expect(requests).toEqual([])
})

test('an unresolved refresh hides the previous Up observation', async ({ page }) => {
  await page.clock.install()
  let waiting = false, release
  const gate = new Promise(resolve => { release = resolve })
  await prepare(page, async route => {
    if (waiting) { await gate; return route.fulfill({ status: 500, json: { message: 'private-error' } }) }
    return route.fulfill({ json: ping() })
  })
  await page.goto('/super-admin/system-health')
  await expect(page.getByText('Current API liveness', { exact: true })).toBeVisible()
  waiting = true
  await page.clock.fastForward(60001)
  await expect(page.getByText('Loading monitoring data...', { exact: true })).toBeVisible()
  await expect(page.getByText('Current API liveness', { exact: true })).toHaveCount(0)
  release()
  await expect(page.locator('[data-system-health-status]')).toContainText('Unable to load System Health.')
})
