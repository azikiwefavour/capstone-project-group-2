import { test, expect } from '@playwright/test'

const jwt = role => `test.${Buffer.from(JSON.stringify({ sub: role === 'super_admin' ? 'audit-test' : 'other-admin', role, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
const token = jwt('super_admin'), adminSession = JSON.stringify({ role: 'admin', token: jwt('admin') })
const activities = Array.from({ length: 105 }, (_, i) => ({ id: `activity-${i}`, rawDate: new Date(Date.UTC(2099, 10, 2, 0, i)).toISOString(), when: 'Wrong formatted date', who: { name: `Actor ${String(i).padStart(3, '0')}`, role: i % 2 ? 'Facility admin' : 'Super admin', email: 'private-email' }, action: `Action ${String(104 - i).padStart(3, '0')}`, facility: `Facility ${String(i).padStart(3, '0')}`, metadata: { secret: 'private-metadata' } }))
function body(url, records = activities) {
  const page = Number(url.searchParams.get('page')), limit = Number(url.searchParams.get('limit'))
  const rows = [...records].reverse()
  return { activities: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, limit, totalPages: Math.ceil(rows.length / limit) }
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
    if (url.pathname === '/api/auth/profile') return route.fulfill({ json: { id: 'audit-test', role: 'super_admin', isEmailVerified: true } })
    expect(url.pathname).toBe('/api/super-admin/activities')
    expect(url.searchParams.has('sortBy')).toBe(false)
    expect(url.searchParams.has('search')).toBe(false)
    calls.push(url)
    return handler(route, url)
  })
  return calls
}
async function footerAtBottom(page) {
  expect(await page.locator('[data-super-admin-audit-log]').evaluate(card => Math.abs(card.getBoundingClientRect().bottom - card.querySelector('.subscriber-pagination').getBoundingClientRect().bottom))).toBeLessThan(2)
}

for (const width of [375, 1024, 1280, 1440]) test(`live audit fields, role below name, seven rows and preserved fit at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 1440 ? 900 : 768 })
  const calls = await prepare(page, (route, url) => route.fulfill({ json: body(url) }))
  await page.goto('/super-admin/audit-log')
  const table = page.getByRole('table'), rows = table.locator('tbody tr')
  await expect(table.getByRole('columnheader')).toHaveText(['When', 'Who', 'Action', 'Facility'])
  await expect(rows).toHaveCount(7)
  await expect(rows.first()).toContainText('Actor 104')
  await expect(rows.first()).toContainText('Super admin')
  await expect(rows.first()).toContainText('Action 000')
  await expect(rows.first()).toContainText('Facility 104')
  await expect(rows.first()).toContainText('2 Nov 2099, 01:44 UTC')
  const who = rows.first().getByRole('cell').nth(1)
  await expect(who.locator('p').first()).toHaveText('Actor 104')
  await expect(who.locator('p').last()).toHaveText('Super admin')
  const nameBox = await who.locator('p').first().boundingBox(), roleBox = await who.locator('p').last().boundingBox()
  expect(roleBox.y).toBeGreaterThan(nameBox.y)
  await expect(page.locator('body')).not.toContainText('private-metadata')
  await expect(page.locator('body')).not.toContainText('private-email')
  await expect(page.locator('body')).not.toContainText('Wrong formatted date')
  await expect(page.getByText('Page 1 of 15', { exact: true })).toBeVisible()
  await footerAtBottom(page)
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(rows.first()).toContainText('Actor 097')
  expect(calls.at(-1).searchParams.get('page')).toBe('2')
  expect(calls.at(-1).searchParams.get('limit')).toBe('7')
  await expect(page.getByRole('button', { name: 'Export data', exact: true })).toBeDisabled()
  await expect(page.getByRole('searchbox')).toHaveCount(0)
  await expect(page.getByRole('combobox')).toHaveCount(0)
  const content = page.getByRole('region', { name: 'Audit log content', exact: true })
  if (width >= 1024) expect(await content.evaluate(node => node.scrollHeight <= node.clientHeight)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('all headings sort the full collection beyond the first 100, with stable seven-row local pagination', async ({ page }) => {
  const calls = await prepare(page, (route, url) => route.fulfill({ json: body(url) }))
  await page.goto('/super-admin/audit-log')
  const rows = page.locator('tbody tr')
  await expect(rows.first()).toContainText('Actor 104')
  await page.getByRole('button', { name: 'Sort by When', exact: true }).click()
  await expect(rows.first()).toContainText('Actor 000')
  expect(calls.some(url => url.searchParams.get('limit') === '100' && url.searchParams.get('page') === '2')).toBe(true)
  const countAfterLoad = calls.length
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(rows.first()).toContainText('Actor 007')
  expect(calls).toHaveLength(countAfterLoad)
  await page.getByRole('button', { name: 'Sort by When', exact: true }).click()
  await expect(rows.first()).toContainText('Actor 104')
  expect(calls.at(-1).searchParams.get('limit')).toBe('7')
  for (const [heading, ascending, descending] of [['Who', 'Actor 000', 'Actor 104'], ['Action', 'Actor 104', 'Actor 000'], ['Facility', 'Actor 000', 'Actor 104']]) {
    await page.getByRole('button', { name: `Sort by ${heading}`, exact: true }).click()
    await expect(rows.first()).toContainText(ascending)
    await expect(page.getByText('Page 1 of 15', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: `Sort by ${heading}`, exact: true }).click()
    await expect(rows.first()).toContainText(descending)
  }
  await expect(rows).toHaveCount(7)
})

for (const width of [375, 1440]) test(`loading/network/schema/retry and exact empty state retain footer at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  let mode = 'loading', release
  const gate = new Promise(resolve => { release = resolve })
  await prepare(page, async (route, url) => {
    if (mode === 'loading') { await gate; return route.abort() }
    if (mode === 'malformed') return route.fulfill({ json: { activities: null } })
    return route.fulfill({ json: body(url, []) })
  })
  await page.goto('/super-admin/audit-log')
  await expect(page.getByText('Loading audit log records...', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
  await footerAtBottom(page)
  release()
  await expect(page.getByRole('alert')).toContainText('Unable to connect.')
  await footerAtBottom(page)
  mode = 'malformed'
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('unexpected audit log response')
  mode = 'empty'
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByText('No audit log records available yet.', { exact: true })).toBeVisible()
  await expect(page.getByText('Page 1 of 1', { exact: true })).toBeVisible()
  await footerAtBottom(page)
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
})

for (const status of [401, 403]) test(`HTTP ${status} clears only the current Super Admin session`, async ({ page }) => {
  await prepare(page, route => route.fulfill({ status, json: { message: 'private-backend-error' } }))
  await page.goto('/super-admin/audit-log')
  await expect(page).toHaveURL(/\/super-admin\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailSuperAdminSession'))).toBeNull()
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailAdminSession'))).toBe(adminSession)
  await expect(page.locator('body')).not.toContainText('private-backend-error')
})

test('server error retries without exposing backend details and leaves export disabled', async ({ page }) => {
  let fail = true
  const downloads = []
  page.on('download', item => downloads.push(item))
  await prepare(page, (route, url) => fail ? route.fulfill({ status: 500, json: { message: 'private-backend-error' } }) : route.fulfill({ json: body(url) }))
  await page.goto('/super-admin/audit-log')
  await expect(page.getByRole('alert')).toContainText('Unable to load audit log records.')
  fail = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(7)
  const button = page.getByRole('button', { name: 'Export data', exact: true })
  await expect(button).toBeVisible(); await expect(button).toBeDisabled()
  await button.evaluate(node => node.click())
  expect(downloads).toEqual([])
})

test('a changing bulk snapshot errors and retries instead of displaying a partial sort', async ({ page }) => {
  let changed = true
  await prepare(page, (route, url) => {
    const result = body(url)
    if (changed && url.searchParams.get('limit') === '100' && url.searchParams.get('page') === '2') result.total = 106
    return route.fulfill({ json: result })
  })
  await page.goto('/super-admin/audit-log')
  await expect(page.locator('tbody tr')).toHaveCount(7)
  await page.getByRole('button', { name: 'Sort by Who', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Audit records changed while loading.')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  changed = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(7)
  await expect(page.locator('tbody tr').first()).toContainText('Actor 000')
})

test('changing back to newest-first cancels and discards an older sort load', async ({ page }) => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  await prepare(page, async (route, url) => {
    if (url.searchParams.get('limit') === '100') { await gate; return route.fulfill({ json: body(url) }).catch(() => {}) }
    return route.fulfill({ json: body(url) })
  })
  await page.goto('/super-admin/audit-log')
  await expect(page.locator('tbody tr').first()).toContainText('Actor 104')
  await page.getByRole('button', { name: 'Sort by Who', exact: true }).click()
  await expect(page.getByText('Loading audit log records...', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sort by When', exact: true }).click()
  await expect(page.locator('tbody tr').first()).toContainText('Actor 104')
  release()
  await expect(page.locator('tbody tr').first()).toContainText('Actor 104')
  await expect(page.getByRole('columnheader').first()).toHaveAttribute('aria-sort', 'descending')
})

test('missing optional audit fields show unavailable labels rather than inferred identities/actions', async ({ page }) => {
  await prepare(page, (route, url) => route.fulfill({ json: body(url, [{ id: 'missing-fields', rawDate: null, who: null, action: null, facility: null }]) }))
  await page.goto('/super-admin/audit-log')
  const cells = page.locator('tbody tr td')
  await expect(cells.nth(0)).toHaveText('Unavailable')
  await expect(cells.nth(1).locator('p')).toHaveText(['Unavailable', 'Unavailable'])
  await expect(cells.nth(2)).toHaveText('Unavailable')
  await expect(cells.nth(3)).toHaveText('—')
})
