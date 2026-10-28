import { test, expect } from '@playwright/test'

const token = `test.${Buffer.from(JSON.stringify({ sub: 'subscriptions-test', role: 'super_admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
const subscribers = Array.from({ length: 15 }, (_, i) => ({ id: `isolated-${i}`, facility: `Isolated hospital ${String(i).padStart(2, '0')}`, plan: i % 2 ? 'Growth' : 'Starter', cycle: i % 2 ? 'Annual' : 'Monthly', status: ['paid', 'trial', 'past_due'][i % 3], amount: i % 2 ? 70000 : 30000, rawNextChargeDate: `2099-11-${String(i + 1).padStart(2, '0')}`, method: i % 2 ? 'Card' : 'Bank transfer', nextCharge: '02 Nov 2026' }))
function plans(annual = false) {
  return { cycle: annual ? 'Annually' : 'Monthly', starter: { name: 'Starter Plan', tier: 'Starter', price: annual ? 300000 : 31000, subscribers: 1, features: ['Unapproved feature'] }, growth: { name: 'Growth Plan', tier: 'Growth', price: annual ? 700000 : 71000, subscribers: 5 } }
}
function body(url) {
  const params = url.searchParams, search = (params.get('search') || '').toLowerCase(), status = params.get('status'), plan = params.get('plan')
  let rows = subscribers.filter(row => row.facility.toLowerCase().includes(search) && (!status || row.status === status) && (!plan || row.plan === plan))
  const column = params.get('sortBy'), direction = params.get('sortOrder') === 'DESC' ? -1 : 1
  rows = [...rows].sort((a, b) => direction * (column === 'amount' ? a.amount - b.amount : (column === 'facility' ? a.facility.localeCompare(b.facility) : a.rawNextChargeDate.localeCompare(b.rawNextChargeDate))))
  const page = Number(params.get('page')), limit = Number(params.get('limit'))
  return { plans: plans(params.get('cycle') === 'Annually'), subscribers: rows.slice((page - 1) * limit, page * limit), pagination: { total: rows.length, page, limit, totalPages: Math.ceil(rows.length / limit) }, summary: { starterSubscribers: 1, growthSubscribers: 5 } }
}
async function prepare(page, handler) {
  const calls = []
  await page.addInitScript(value => sessionStorage.setItem('medtrailSuperAdminSession', JSON.stringify({ token: value })), token)
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url())
    expect(route.request().method()).toBe('GET')
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`)
    if (url.pathname === '/api/auth/profile') return route.fulfill({ json: { id: 'subscriptions-test', role: 'super_admin', isEmailVerified: true } })
    expect(url.pathname).toBe('/api/super-admin/subscriptions')
    calls.push(url)
    return handler(route, url)
  })
  return calls
}
async function footerAtBottom(page) {
  expect(await page.locator('[data-subscribers-card]').evaluate(card => Math.abs(card.getBoundingClientRect().bottom - card.querySelector('.subscriber-pagination').getBoundingClientRect().bottom))).toBeLessThan(2)
}

for (const width of [375, 1440]) test(`server subscriptions, plan prices and independent cycle toggle at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  const calls = await prepare(page, (route, url) => route.fulfill({ json: body(url) }))
  await page.goto('/super-admin/subscriptions')
  const table = page.getByRole('table'), rows = table.locator('tbody tr'), starter = page.getByRole('article', { name: 'Starter Plan' }), growth = page.getByRole('article', { name: 'Growth Plan' })
  await expect(rows).toHaveCount(7)
  await expect(starter.getByText('₦31,000', { exact: true })).toBeVisible()
  await expect(growth.getByText('₦71,000', { exact: true })).toBeVisible()
  await expect(starter.getByRole('listitem')).toHaveText(['3 clinicians', 'Up to 300 patients', '300 messages/month', 'Audit log and role-based access'])
  await expect(page.locator('[data-plan-subscribers]').getByText('—', { exact: true })).toHaveCount(2)
  await expect(rows.first()).toContainText('Isolated hospital 00')
  await expect(rows.first()).toContainText('₦30,000')
  await expect(rows.first()).toContainText('01 Nov 2099')
  await expect(table).not.toContainText('Bank transfer')
  await expect(rows.nth(1).locator('td').nth(5)).toHaveText('Card')
  await expect(rows.nth(1).locator('td').nth(3)).toHaveText('Not available')
  await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible()
  await footerAtBottom(page)
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(rows.first()).toContainText('Isolated hospital 07')
  const cycles = await rows.locator('td:nth-child(3)').allTextContents()
  await page.getByRole('radiogroup', { name: 'Billing cycle' }).getByText('Annually', { exact: true }).click()
  await expect(starter.getByText('₦300,000', { exact: true })).toBeVisible()
  await expect(growth.getByText('₦700,000', { exact: true })).toBeVisible()
  await expect(starter.locator('del')).toHaveText('₦360,000')
  await expect(rows.first()).toContainText('Isolated hospital 07')
  expect(await rows.locator('td:nth-child(3)').allTextContents()).toEqual(cycles)
  expect(calls.at(-1).searchParams.get('page')).toBe('2')
  expect(calls.at(-1).searchParams.has('cycleFilter')).toBe(false)
  await page.getByRole('searchbox').fill('hospital 02')
  await expect(rows.first()).toContainText('Isolated hospital 02')
  await expect(rows).toHaveCount(1)
  expect(calls.at(-1).searchParams.get('search')).toBe('hospital 02')
  expect(calls.at(-1).searchParams.get('page')).toBe('1')
  await page.getByRole('searchbox').fill('no match')
  await expect(table).toContainText('No matching subscriptions found.')
  await footerAtBottom(page)
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('server filtering and all six sort choices reset pagination and retain approved controls', async ({ page }) => {
  const calls = await prepare(page, (route, url) => route.fulfill({ json: body(url) }))
  await page.goto('/super-admin/subscriptions')
  await expect(page.locator('tbody tr')).toHaveCount(7)
  await page.getByRole('button', { name: 'Filter', exact: true }).click()
  await page.getByLabel('Subscription status', { exact: true }).selectOption('paid')
  await page.getByLabel('Subscription plan', { exact: true }).selectOption('Growth')
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.locator('tbody tr').first()).toContainText('Isolated hospital 03')
  expect(calls.at(-1).searchParams.get('status')).toBe('paid')
  expect(calls.at(-1).searchParams.get('plan')).toBe('Growth')
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page.keyboard.press('Escape')
  await expect(page.locator('tbody tr')).toHaveCount(7)
  for (const [sort, by, order] of [['name_desc', 'facility', 'DESC'], ['name_asc', 'facility', 'ASC'], ['amount_desc', 'amount', 'DESC'], ['amount_asc', 'amount', 'ASC'], ['charge_desc', 'nextCharge', 'DESC'], ['charge_asc', 'nextCharge', 'ASC']]) {
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Sort', exact: true }).click()
    await page.getByLabel('Sort subscribers', { exact: true }).selectOption(sort)
    await page.keyboard.press('Escape')
    await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible()
    expect(calls.at(-1).searchParams.get('sortBy')).toBe(by)
    expect(calls.at(-1).searchParams.get('sortOrder')).toBe(order)
  }
})

for (const width of [375, 1440]) test(`loading, network error, retry, malformed and empty keep footer at bottom at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  let mode = 'loading', release
  const gate = new Promise(resolve => { release = resolve })
  await prepare(page, async (route, url) => {
    if (mode === 'loading') { await gate; return route.abort() }
    if (mode === 'malformed') return route.fulfill({ json: {} })
    const result = body(url)
    result.subscribers = []; result.pagination = { total: 0, page: 1, limit: 7, totalPages: 0 }
    if (mode === 'missingPlans') delete result.plans
    return route.fulfill({ json: result })
  })
  await page.goto('/super-admin/subscriptions')
  await expect(page.getByText('Loading subscriptions...', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled()
  await footerAtBottom(page)
  release()
  await expect(page.getByRole('alert')).toContainText('Unable to connect.')
  await footerAtBottom(page)
  mode = 'malformed'
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('unexpected subscriptions response')
  mode = 'empty'
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByText('No subscriptions available yet.', { exact: true })).toBeVisible()
  await expect(page.getByRole('article', { name: 'Starter Plan' }).getByText('₦31,000', { exact: true })).toBeVisible()
  await expect(page.locator('[data-plan-subscribers]').getByText('—', { exact: true })).toHaveCount(2)
  await footerAtBottom(page)
  mode = 'missingPlans'
  await page.getByRole('radiogroup').getByText('Annually', { exact: true }).click()
  await expect(page.getByRole('article', { name: 'Starter Plan' }).getByText('—', { exact: true })).toHaveCount(2)
  await expect(page.getByRole('article', { name: 'Starter Plan' }).locator('del')).toHaveCount(0)
})

for (const status of [401, 403]) test(`HTTP ${status} clears Super Admin session and redirects`, async ({ page }) => {
  await prepare(page, route => route.fulfill({ status, json: { message: 'private-server-error' } }))
  await page.goto('/super-admin/subscriptions')
  await expect(page).toHaveURL(/\/super-admin\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailSuperAdminSession'))).toBeNull()
  await expect(page.locator('body')).not.toContainText('private-server-error')
})

test('server error retries without displaying private messages or losing authentication', async ({ page }) => {
  let fail = true
  await prepare(page, (route, url) => fail ? route.fulfill({ status: 500, json: { message: 'private-server-error' } }) : route.fulfill({ json: body(url) }))
  await page.goto('/super-admin/subscriptions')
  await expect(page.getByRole('alert')).toContainText('Unable to load subscriptions.')
  await expect(page.locator('body')).not.toContainText('private-server-error')
  fail = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(7)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailSuperAdminSession'))).not.toBeNull()
})

test('stale search response cannot replace current subscribers', async ({ page }) => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  await prepare(page, async (route, url) => {
    if (url.searchParams.get('search') === 'older') { await gate; return route.fulfill({ json: body(url) }).catch(() => {}) }
    return route.fulfill({ json: body(url) })
  })
  await page.goto('/super-admin/subscriptions')
  await expect(page.locator('tbody tr')).toHaveCount(7)
  await page.getByRole('searchbox').fill('older')
  await expect(page.getByText('Loading subscriptions...', { exact: true })).toBeVisible()
  await page.waitForTimeout(300)
  await page.getByRole('searchbox').fill('hospital 02')
  await expect(page.locator('tbody tr').first()).toContainText('Isolated hospital 02')
  release()
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody')).toContainText('Isolated hospital 02')
})
