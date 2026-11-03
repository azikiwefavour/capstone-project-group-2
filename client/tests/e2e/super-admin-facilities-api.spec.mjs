import { test, expect } from '@playwright/test'

const jwt = `test.${Buffer.from(JSON.stringify({ sub: 'facilities-test', role: 'super_admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
const records = Array.from({ length: 15 }, (_, i) => ({ id: `isolated-${i}`, name: `Isolated hospital ${String(i).padStart(2, '0')}`, plan: 'Growth Plan', billingCycle: 'Monthly', status: ['active', 'trial', 'past_due'][i % 3], monthlyFee: 70000, renewalDate: '2099-11-02', clinicians: 8, patients: 50, messages: 100 }))
async function prepare(page, handler) {
  const calls = []
  await page.addInitScript(token => sessionStorage.setItem('medtrailSuperAdminSession', JSON.stringify({ token })), jwt)
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url())
    expect(route.request().method()).toBe('GET')
    expect(route.request().headers().authorization).toBe(`Bearer ${jwt}`)
    if (url.pathname === '/api/auth/profile') return route.fulfill({ json: { id: 'facilities-test', role: 'super_admin', isEmailVerified: true } })
    calls.push(url)
    return handler(route, url)
  })
  return calls
}
function list(route, url) {
  const search = url.searchParams.get('search') || '', status = url.searchParams.get('status')
  const rows = records.filter(row => row.name.includes(search) && (!status || row.status === status))
  const page = Number(url.searchParams.get('page')), limit = Number(url.searchParams.get('limit'))
  return route.fulfill({ json: { facilities: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, limit, totalPages: Math.ceil(rows.length / limit), counts: { all: 15, active: 5, trial: 5, past_due: 5 } } })
}
function detail(route) {
  return route.fulfill({ json: { ...records[0], name: 'Detailed isolated hospital', renewalDate: undefined, monthlyFee: undefined, monthlyValue: 70000, facilityAdmin: { name: 'Unverified fallback' }, renewal: { date: '2026-11-02' }, cards: { messages: { label: 'Messages (Nov)', percentage: 80 } } } })
}

for (const width of [375, 1440]) test(`Facilities live adapter keeps tabs/search/sort/pages/modal at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  const calls = await prepare(page, (route, url) => url.pathname === '/api/super-admin/facilities' ? list(route, url) : detail(route))
  await page.goto('/super-admin/facilities')
  const table = page.getByRole('table'), rows = table.locator('tbody tr'), filters = page.getByRole('group', { name: 'Facility status filters' })
  await expect(rows).toHaveCount(7)
  await expect(filters.getByRole('button')).toHaveText(['All15', 'Active5', 'Trial5', 'Past due5'])
  for (const cell of [3, 4, 5]) await expect(rows.first().getByRole('cell').nth(cell)).toHaveText('—')
  await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(rows.first()).toContainText('Isolated hospital 07')
  expect(calls.at(-1).searchParams.get('page')).toBe('2')
  await filters.getByRole('button', { name: /^Past due/ }).click()
  await expect(rows).toHaveCount(5)
  expect(calls.at(-1).searchParams.get('status')).toBe('past_due')
  await page.getByRole('searchbox').fill('hospital 02')
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('Isolated hospital 02')
  expect(calls.at(-1).searchParams.get('search')).toBe('hospital 02')
  await page.getByRole('searchbox').fill('no match')
  await expect(table).toContainText('No matching facilities found.')
  await page.getByRole('searchbox').fill('')
  await filters.getByRole('button', { name: /^All/ }).click()
  await expect(rows).toHaveCount(7)
  await page.getByRole('button', { name: 'Sort by Facility', exact: true }).click()
  await expect(rows.first()).toContainText('Isolated hospital 00')
  await expect.poll(() => calls.at(-1).searchParams.get('limit')).toBe('100')
  await page.getByRole('button', { name: 'Sort by Facility', exact: true }).click()
  await expect(rows.first()).toContainText('Isolated hospital 14')
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(rows.first()).toContainText('Isolated hospital 07')
  await page.getByRole('button', { name: 'Previous page' }).click()
  await page.getByRole('button', { name: 'Sort by Facility', exact: true }).click()
  await expect(rows.first()).toContainText('Isolated hospital 00')
  await rows.first().getByRole('button', { name: /^View/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Detailed isolated hospital' })).toBeVisible()
  await expect(dialog.getByRole('group', { name: 'Facility summary' }).getByText('—', { exact: true })).toHaveCount(3)
  await expect(dialog.locator('dl')).toContainText('2099')
  await expect(dialog.locator('dl')).toContainText('₦70,000')
  await expect(dialog).not.toContainText('Unverified fallback')
  await expect(dialog.getByRole('region', { name: 'Messages (Nov)', exact: true })).toBeVisible()
  const bars = dialog.locator('[aria-hidden="true"].mt-2 > div')
  await expect(bars).toHaveCount(3)
  for (const bar of await bars.all()) await expect(bar).toHaveCSS('width', '0px')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(calls.every(url => !url.searchParams.has('sortBy') && !url.pathname.endsWith('/review'))).toBe(true)
})

test('list loading, network failure, retry, empty and malformed response', async ({ page }) => {
  let mode = 'loading', release
  const gate = new Promise(resolve => { release = resolve })
  await prepare(page, async (route, url) => {
    if (mode === 'loading') { await gate; return route.abort() }
    if (mode === 'empty') return route.fulfill({ json: { facilities: [], total: 0, page: 1, limit: 7, totalPages: 0, counts: { all: 0, active: 0, trial: 0, past_due: 0 } } })
    if (mode === 'malformed') return route.fulfill({ json: { facilities: null } })
    return list(route, url)
  })
  await page.goto('/super-admin/facilities')
  await expect(page.getByText('Loading facilities...', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled()
  release()
  await expect(page.getByRole('alert')).toContainText('Unable to connect.')
  mode = 'malformed'
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('unexpected facilities response')
  mode = 'empty'
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByText('No facilities available yet.', { exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Facility status filters' }).getByRole('button')).toHaveText(['All0', 'Active0', 'Trial0', 'Past due0'])
})

test('detail loading, 404, retry and dismissal retain modal behavior', async ({ page }) => {
  let release, mode = 'loading'
  const gate = new Promise(resolve => { release = resolve })
  await prepare(page, async (route, url) => {
    if (url.pathname === '/api/super-admin/facilities') return list(route, url)
    if (mode === 'loading') { await gate; return route.fulfill({ status: 404, json: { message: 'private-error' } }) }
    return detail(route)
  })
  await page.goto('/super-admin/facilities')
  await page.getByRole('button', { name: 'View Isolated hospital 00', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('status')).toHaveText('Loading facility details...')
  release()
  await expect(dialog.getByRole('alert')).toContainText('This facility is no longer available.')
  await expect(dialog).not.toContainText('private-error')
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Try again' })).toBeFocused()
  mode = 'ready'
  await dialog.getByRole('button', { name: 'Try again' }).click()
  await expect(dialog.getByRole('heading', { name: 'Detailed isolated hospital' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'View Isolated hospital 00', exact: true })).toBeFocused()
})

for (const status of [401, 403]) for (const location of ['list', 'detail']) test(`${location} HTTP ${status} expires only the Super Admin session`, async ({ page }) => {
  await prepare(page, (route, url) => location === 'detail' && url.pathname === '/api/super-admin/facilities' ? list(route, url) : route.fulfill({ status, json: { message: 'private-error' } }))
  await page.goto('/super-admin/facilities')
  if (location === 'detail') await page.getByRole('button', { name: 'View Isolated hospital 00', exact: true }).click()
  await expect(page).toHaveURL(/\/super-admin\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailSuperAdminSession'))).toBeNull()
  await expect(page.locator('body')).not.toContainText('private-error')
})

test('changing search discards an older response', async ({ page }) => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  await prepare(page, async (route, url) => {
    if (url.searchParams.get('search') === 'older') { await gate; return route.fulfill({ json: { facilities: [records[0]], total: 1, page: 1, limit: 7, totalPages: 1 } }).catch(() => {}) }
    return list(route, url)
  })
  await page.goto('/super-admin/facilities')
  await expect(page.locator('tbody tr')).toHaveCount(7)
  await page.getByRole('searchbox').fill('older')
  await expect(page.getByText('Loading facilities...', { exact: true })).toBeVisible()
  await page.waitForTimeout(300)
  await page.getByRole('searchbox').fill('hospital 02')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody')).toContainText('Isolated hospital 02')
  release()
  await expect(page.locator('tbody')).not.toContainText('Isolated hospital 00')
})
