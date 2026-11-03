import { test, expect } from '@playwright/test'

const jwt = role => `test.${Buffer.from(JSON.stringify({ sub: role === 'super_admin' ? 'messaging-test' : 'other-admin', role, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
const token = jwt('super_admin'), adminSession = JSON.stringify({ role: 'admin', token: jwt('admin') })
const logs = Array.from({ length: 15 }, (_, i) => ({ id: `isolated-${i}`, rawTime: `2099-11-${String(i + 1).padStart(2, '0')}T12:34:56Z`, time: 'Wrong display time', facility: `Full isolated hospital ${String(i).padStart(2, '0')}`, facilityShort: 'Wrong short name', to: i % 3 === 0 ? 'jo****9@example.test' : i % 3 === 1 ? '+234802****447' : '+2348021234447', rawTo: 'private-recipient@example.test', message: ['Staff invite', 'Verification code', 'Prescription details', 'General notification'][i % 4], channel: ['Email', 'SMS', 'WhatsApp'][i % 3], rawStatus: ['sent', 'failed', 'queued', 'delivered'][i % 4], status: 'Wrong formatted status', failureReason: 'private-failure' }))
function body(url, records = logs) {
  const tab = url.searchParams.get('tab'), page = Number(url.searchParams.get('page')), limit = Number(url.searchParams.get('limit'))
  const rows = [...records].filter(row => tab === 'all' || row.rawStatus === tab).reverse()
  return { logs: rows.slice((page - 1) * limit, page * limit), pagination: { total: rows.length, page, limit, totalPages: Math.ceil(rows.length / limit) || 1 }, summary: { sentInOctober: { count: 3366 }, deliveryRate: { rate: 97.6 }, failed: { count: 81 }, termiiCredit: { balance: 48000, currency: 'NGN' } }, messages: { breakdown: [{ type: 'Staff invites', count: 1120 }] }, usage: { items: [{ facilityName: 'Static facility must not render', used: 640, quota: 1000 }] }, counts: { all: 6, failed: 1, queued: 1, delivered: 4 } }
}
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
    if (url.pathname === '/api/auth/profile') return route.fulfill({ json: { id: 'messaging-test', role: 'super_admin', isEmailVerified: true } })
    expect(['/api/super-admin/messaging', '/api/super-admin/messaging/usage']).toContain(url.pathname)
    calls.push(url)
    return handler(route, url)
  })
  return calls
}
async function footerAtBottom(page) {
  expect(await page.locator('[data-message-log-card]').evaluate(card => Math.abs(card.getBoundingClientRect().bottom - card.querySelector('.subscriber-pagination').getBoundingClientRect().bottom))).toBeLessThan(2)
}

for (const width of [375, 1440]) test(`live log/tab/pages retain unknown metrics and safe records at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  const calls = await prepare(page, (route, url) => route.fulfill({ json: body(url) }))
  await page.goto('/super-admin/messaging')
  const log = page.locator('[data-super-admin-message-log]'), rows = log.locator('tbody tr'), filters = log.getByRole('group', { name: 'Message status filters' })
  await expect(rows).toHaveCount(7)
  await expect(rows.first()).toContainText('Full isolated hospital 14')
  await expect(rows.first()).toContainText('Nov 15, 12:34')
  await expect(rows.first()).toContainText('Recipient unavailable')
  await expect(log).not.toContainText('private-recipient')
  await expect(log).not.toContainText('+2348021234447')
  await expect(log).not.toContainText('Wrong formatted')
  const summary = page.getByRole('region', { name: 'Messaging summary' })
  for (const card of await summary.getByRole('article').all()) await expect(card.locator('p').first()).toHaveText('—')
  await expect(page.getByRole('region', { name: 'Messages', exact: true }).getByText('—', { exact: true })).toHaveCount(3)
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('Static facility must not render')
  await expect(log.getByText('Page 1 of 3', { exact: true })).toBeVisible()
  await footerAtBottom(page)
  await log.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(rows.first()).toContainText('Full isolated hospital 07')
  expect(calls.at(-1).searchParams.get('page')).toBe('2')
  await filters.getByRole('button', { name: 'Failed', exact: true }).click()
  await expect(rows).toHaveCount(4)
  await expect(rows.first()).toContainText('Full isolated hospital 13')
  expect(calls.at(-1).searchParams.get('tab')).toBe('failed')
  expect(calls.at(-1).searchParams.get('page')).toBe('1')
  await filters.getByRole('button', { name: 'Queued', exact: true }).click()
  await expect(rows).toHaveCount(4)
  await expect(rows.first()).toContainText('Full isolated hospital 14')
  expect(calls.at(-1).searchParams.get('tab')).toBe('queued')
  await filters.getByRole('button', { name: 'All', exact: true }).click()
  await expect(rows).toHaveCount(7)
  await log.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(log.getByText('Page 2 of 3', { exact: true })).toBeVisible()
  await log.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('Full isolated hospital 00')
  await expect(rows.first()).toContainText('jo****9@example.test')
  await expect(rows.first()).toContainText('Email')
  await expect(rows.first()).toContainText('Sent')
  await expect(rows.first()).toContainText('Staff invite')
  await expect(log.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
  expect(calls.every(url => url.searchParams.get('limit') === '7')).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

for (const width of [375, 1440]) test(`log loading/network/schema/retry/empty retain bottom pagination at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  let mode = 'loading', release
  const gate = new Promise(resolve => { release = resolve })
  await prepare(page, async (route, url) => {
    if (mode === 'loading') { await gate; return route.abort() }
    if (mode === 'malformed') return route.fulfill({ json: { logs: null } })
    return route.fulfill({ json: body(url, []) })
  })
  await page.goto('/super-admin/messaging')
  const log = page.locator('[data-super-admin-message-log]')
  await expect(log.getByText('Loading messages...', { exact: true })).toBeVisible()
  await expect(log.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
  await footerAtBottom(page)
  release()
  await expect(log.getByRole('alert')).toContainText('Unable to connect.')
  mode = 'malformed'
  await log.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(log.getByRole('alert')).toContainText('unexpected messaging response')
  mode = 'empty'
  await log.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(log.getByText('No messages available yet.', { exact: true })).toBeVisible()
  await footerAtBottom(page)
  await log.getByRole('button', { name: 'Failed', exact: true }).click()
  await expect(log.getByText('No matching messages found.', { exact: true })).toBeVisible()
  await expect(page.getByRole('article', { name: 'Failed', exact: true }).locator('p').first()).toHaveText('—')
})

test('View all reads usage on demand, withholds static data, and retries its own network/schema error', async ({ page }) => {
  let mode = 'waiting', release
  const gate = new Promise(resolve => { release = resolve })
  const calls = await prepare(page, async (route, url) => {
    if (!url.pathname.endsWith('/usage')) return route.fulfill({ json: body(url) })
    if (mode === 'waiting') { await gate; return route.abort() }
    if (mode === 'malformed') return route.fulfill({ json: {} })
    return route.fulfill({ json: { quotaPerFacility: 1000, facilities: [{ facilityName: 'Static usage facility must not render', used: 910, quota: 1000, percentage: 91 }] } })
  })
  await page.goto('/super-admin/messaging')
  await expect(page.locator('tbody tr')).toHaveCount(7)
  const usage = page.getByRole('region', { name: 'Usage', exact: true })
  await expect(usage).toContainText('Facility SMS usage and monthly allocations are unavailable.')
  expect(calls.some(url => url.pathname.endsWith('/usage'))).toBe(false)
  await usage.getByRole('button', { name: 'View all', exact: true }).click()
  await expect(usage.getByRole('status')).toHaveText('Loading facility usage...')
  release()
  await expect(usage.getByRole('alert')).toContainText('Unable to connect.')
  mode = 'malformed'
  await usage.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(usage.getByRole('alert')).toContainText('unexpected messaging usage response')
  mode = 'ready'
  await usage.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(usage).toContainText('Facility SMS usage and monthly allocations are unavailable.')
  await expect(usage.getByRole('listitem')).toHaveCount(0)
  await expect(usage.getByRole('progressbar')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('Static usage facility must not render')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('tbody tr')).toHaveCount(7)
})

for (const status of [401, 403]) for (const context of ['log', 'usage']) test(`${context} HTTP ${status} clears only Super Admin session`, async ({ page }) => {
  await prepare(page, (route, url) => context === 'usage' && !url.pathname.endsWith('/usage') ? route.fulfill({ json: body(url) }) : route.fulfill({ status, json: { message: 'private-backend-error' } }))
  await page.goto('/super-admin/messaging')
  if (context === 'usage') await page.getByRole('button', { name: 'View all', exact: true }).click()
  await expect(page).toHaveURL(/\/super-admin\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailSuperAdminSession'))).toBeNull()
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailAdminSession'))).toBe(adminSession)
  await expect(page.locator('body')).not.toContainText('private-backend-error')
})

test('log server failure retries without exposing backend fields', async ({ page }) => {
  let fail = true
  await prepare(page, (route, url) => fail ? route.fulfill({ status: 500, json: { message: 'private-backend-error' } }) : route.fulfill({ json: body(url) }))
  await page.goto('/super-admin/messaging')
  const log = page.locator('[data-super-admin-message-log]')
  await expect(log.getByRole('alert')).toContainText('Unable to load messaging data.')
  await expect(page.locator('body')).not.toContainText('private-backend-error')
  fail = false
  await log.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(log.locator('tbody tr')).toHaveCount(7)
})

test('rapid tab changes discard an older response', async ({ page }) => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  await prepare(page, async (route, url) => {
    if (url.searchParams.get('tab') === 'failed') { await gate; return route.fulfill({ json: body(url) }).catch(() => {}) }
    return route.fulfill({ json: body(url) })
  })
  await page.goto('/super-admin/messaging')
  const log = page.locator('[data-super-admin-message-log]')
  await expect(log.locator('tbody tr')).toHaveCount(7)
  await log.getByRole('button', { name: 'Failed', exact: true }).click()
  await expect(log.getByRole('status')).toHaveText('Loading messages...')
  await log.getByRole('button', { name: 'Queued', exact: true }).click()
  await expect(log.locator('tbody tr')).toHaveCount(4)
  await expect(log.locator('tbody tr').first()).toContainText('Full isolated hospital 14')
  release()
  await expect(log.locator('tbody tr').first()).toContainText('Full isolated hospital 14')
  await expect(log.getByRole('button', { name: 'Queued', exact: true })).toHaveAttribute('aria-pressed', 'true')
})
