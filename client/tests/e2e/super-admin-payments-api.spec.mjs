import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const token = `test.${Buffer.from(JSON.stringify({ sub: 'payments-test', role: 'super_admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
const adminSession = JSON.stringify({ role: 'admin', token: `test.${Buffer.from(JSON.stringify({ sub: 'other-admin', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test` })
const transactions = Array.from({ length: 15 }, (_, i) => ({ id: `payment-${i}`, reference: 'Backend collapsed reference', fullReference: `PSK_real_${i}`, facility: `Isolated full hospital name ${String(i).padStart(2, '0')}`, facilityShort: 'Wrong short name', amount: 12500.25 + i, channel: ['Card', 'Bank Transfer', 'USSD'][i % 3], gateway: 'Paystack', rawDate: `2099-11-${String(i + 1).padStart(2, '0')}T12:34:56Z`, date: 'Wrong display date', status: 'Wrong display status', rawStatus: ['successful', 'pending', 'failed'][i % 3], customerEmail: 'private-customer' }))
const csvHeader = 'Reference,Facility,Amount (NGN),Channel,Gateway,Date,Status,Status Reason,Plan,Billing Cycle,Retries'
const statusLabels = { successful: 'Successful', pending: 'Pending', failed: 'Failed' }
const date = raw => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(raw))
const csvFor = (rows, altered = false) => [csvHeader, ...rows.map(row => [`"${altered ? row.reference : row.fullReference}"`, `"${row.facility}"`, row.amount, `"${row.channel}"`, `"${row.gateway}"`, `"${date(row.rawDate)}"`, `"${statusLabels[row.rawStatus]}"`, '"Fabricated reason"', '"Growth"', '"Monthly"', '0'].join(','))].join('\r\n')
function payload(url, rows = transactions) {
  const page = Number(url.searchParams.get('page')), limit = Number(url.searchParams.get('limit'))
  const sorted = [...rows].reverse()
  return { transactions: sorted.slice((page - 1) * limit, page * limit), pagination: { total: rows.length, page, limit, totalPages: Math.ceil(rows.length / limit) || 1 }, counts: { failed: rows.filter(row => row.rawStatus === 'failed').length }, summary: { collectedLast90Days: { amount: 1500000 }, pendingSettlement: { amount: 70000 }, failedCharges: { count: 2 } } }
}
async function prepare(page, handler) {
  const calls = []
  await page.addInitScript(({ value, admin }) => {
    sessionStorage.setItem('medtrailSuperAdminSession', JSON.stringify({ token: value }))
    sessionStorage.setItem('medtrailAdminSession', admin)
  }, { value: token, admin: adminSession })
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url())
    expect(route.request().method()).toBe('GET')
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`)
    if (url.pathname === '/api/auth/profile') return route.fulfill({ json: { id: 'payments-test', role: 'super_admin', isEmailVerified: true } })
    expect(['/api/super-admin/payments', '/api/super-admin/payments/export']).toContain(url.pathname)
    calls.push(url)
    return handler(route, url)
  })
  return calls
}
async function footerAtBottom(page) {
  expect(await page.locator('[data-transactions-card]').evaluate(card => Math.abs(card.getBoundingClientRect().bottom - card.querySelector('.subscriber-pagination').getBoundingClientRect().bottom))).toBeLessThan(2)
}

for (const width of [375, 1440]) test(`payments map actual records, safe summaries, seven rows and accurate CSV at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  const calls = await prepare(page, (route, url) => url.pathname.endsWith('/export') ? route.fulfill({ contentType: 'text/csv; charset=utf-8', body: csvFor([...transactions].reverse()) }) : route.fulfill({ json: payload(url) }))
  await page.goto('/super-admin/payments')
  const table = page.getByRole('table'), rows = table.locator('tbody tr'), summary = page.getByRole('region', { name: 'Payment summary' })
  await expect(rows).toHaveCount(7)
  await expect(rows.first()).toContainText('PSK_real_14')
  await expect(rows.first()).toContainText('Isolated full hospital name 14')
  await expect(rows.first()).toContainText('₦12,514.25')
  await expect(rows.first()).toContainText('15 Nov 2099')
  await expect(rows.first()).toContainText('Failed')
  await expect(summary.getByRole('article', { name: 'Collected (last 90 days)', exact: true }).getByText('—', { exact: true })).toBeVisible()
  await expect(summary.getByRole('article', { name: 'Pending Settlement', exact: true }).getByText('—', { exact: true })).toBeVisible()
  await expect(summary.getByRole('article', { name: 'Failed charges', exact: true }).getByText('5', { exact: true })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('private-customer')
  await expect(page.locator('body')).not.toContainText('Wrong display')
  await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible()
  await footerAtBottom(page)
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(rows.first()).toContainText('PSK_real_7')
  expect(calls.at(-1).searchParams.get('page')).toBe('2')
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('PSK_real_0')
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Export list', exact: true }).scrollIntoViewIfNeeded()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export list', exact: true }).click()
  const download = await downloaded
  expect(download.suggestedFilename()).toBe('medtrail-payments.csv')
  const csv = await readFile(await download.path(), 'utf8')
  expect(csv.split('\r\n')).toHaveLength(16)
  expect(csv).toContain('PSK_real_0')
  expect(csv).toContain('12500.25')
  expect(csv).not.toContain('Fabricated reason')
  expect(csv).not.toContain('Backend collapsed reference')
  expect(csv.split('\r\n')[0]).toBe('"Reference","Facility","Amount (NGN)","Channel","Gateway","Date","Status"')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /retry payment|refund/i })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

for (const width of [375, 1440]) test(`loading, network error, schema error, retry and empty preserve footer at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  let mode = 'loading', release
  const gate = new Promise(resolve => { release = resolve })
  await prepare(page, async (route, url) => {
    if (mode === 'loading') { await gate; return route.abort() }
    if (mode === 'malformed') return route.fulfill({ json: {} })
    return route.fulfill({ json: payload(url, []) })
  })
  await page.goto('/super-admin/payments')
  await expect(page.getByText('Loading payment transactions...', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export list', exact: true })).toBeDisabled()
  await footerAtBottom(page)
  release()
  await expect(page.getByRole('alert')).toContainText('Unable to connect.')
  await footerAtBottom(page)
  mode = 'malformed'
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('unexpected payments response')
  mode = 'empty'
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByText('No payment transactions available yet.', { exact: true })).toBeVisible()
  await expect(page.getByRole('article', { name: 'Failed charges', exact: true }).getByText('0', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
  await footerAtBottom(page)
})

for (const status of [401, 403]) for (const context of ['list', 'export']) test(`${context} HTTP ${status} clears only the current Super Admin session`, async ({ page }) => {
  await prepare(page, (route, url) => context === 'export' && !url.pathname.endsWith('/export') ? route.fulfill({ json: payload(url) }) : route.fulfill({ status, json: { message: 'private-error' } }))
  await page.goto('/super-admin/payments')
  if (context === 'export') await page.getByRole('button', { name: 'Export list', exact: true }).click()
  await expect(page).toHaveURL(/\/super-admin\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailSuperAdminSession'))).toBeNull()
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailAdminSession'))).toBe(adminSession)
  await expect(page.locator('body')).not.toContainText('private-error')
})

test('export loading and altered-reference errors do not download; the existing button retries safely', async ({ page }) => {
  let mode = 'waiting', release
  const downloads = [], gate = new Promise(resolve => { release = resolve })
  page.on('download', item => downloads.push(item))
  await prepare(page, async (route, url) => {
    if (!url.pathname.endsWith('/export')) return route.fulfill({ json: payload(url) })
    if (mode === 'waiting') await gate
    return route.fulfill({ contentType: 'text/csv', body: csvFor([...transactions].reverse(), mode !== 'ready') })
  })
  await page.goto('/super-admin/payments')
  const button = page.getByRole('button', { name: 'Export list', exact: true })
  await button.click()
  await expect(page.getByRole('status')).toHaveText('Preparing payment export...')
  await expect(button).toBeDisabled()
  release()
  await expect(page.getByRole('alert')).toContainText('altered references or inconsistent records')
  expect(downloads).toHaveLength(0)
  mode = 'ready'
  const download = page.waitForEvent('download')
  await button.click()
  await download
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('export over 100 rows refuses silent truncation', async ({ page }) => {
  let exportRequests = 0
  await prepare(page, (route, url) => {
    if (url.pathname.endsWith('/export')) { exportRequests++; return route.abort() }
    const result = payload(url); result.pagination.total = 101; result.pagination.totalPages = Math.ceil(101 / result.pagination.limit)
    return route.fulfill({ json: result })
  })
  await page.goto('/super-admin/payments')
  await page.getByRole('button', { name: 'Export list', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('at most 100 transactions')
  expect(exportRequests).toBe(0)
})

test('list HTTP 500 retries without exposing backend text', async ({ page }) => {
  let fail = true
  await prepare(page, (route, url) => fail ? route.fulfill({ status: 500, json: { message: 'private-error' } }) : route.fulfill({ json: payload(url) }))
  await page.goto('/super-admin/payments')
  await expect(page.getByRole('alert')).toContainText('Unable to load payments.')
  await expect(page.locator('body')).not.toContainText('private-error')
  fail = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(7)
})

test('leaving Payments cancels a pending CSV download', async ({ page }) => {
  let release
  const gate = new Promise(resolve => { release = resolve }), downloads = []
  page.on('download', item => downloads.push(item))
  await prepare(page, async (route, url) => {
    if (!url.pathname.endsWith('/export')) return route.fulfill({ json: payload(url) })
    await gate
    return route.fulfill({ contentType: 'text/csv', body: csvFor([...transactions].reverse()) }).catch(() => {})
  })
  await page.goto('/super-admin/payments')
  await page.getByRole('button', { name: 'Export list', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Preparing payment export...')
  await page.goto('/super-admin/preview/payments')
  release()
  await expect(page.getByRole('heading', { name: 'Payments', exact: true })).toBeVisible()
  expect(downloads).toHaveLength(0)
})
