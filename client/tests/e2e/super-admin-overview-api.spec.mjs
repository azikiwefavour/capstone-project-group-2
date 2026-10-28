import { test, expect } from '@playwright/test'

// Isolated API fixtures. Never contact a backend/database in browser tests.
const jwt = `test.${Buffer.from(JSON.stringify({ sub: 'overview-test', role: 'super_admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
const dashboard = () => ({
  stats: { registeredFacilities: { total: 8, awaitingReview: 2 }, activeSubscribers: { total: 4 }, messagesSent: { total: 3366 }, patientsOnRecord: { total: 5638 } },
  revenue: { mrr: 676667, chart: [{ month: 'Oct', amount: 676667 }] },
  planMix: { plans: [{ name: 'Growth Plan', subscribersCount: 5, percentage: 100 }] },
  integrations: [{ id: 'paystack', status: 'operational', uptimePercent: 99.97, latencyMs: 410 }],
  upcomingRenewals: [{ id: 'renewal-test', facilityName: 'Isolated facility', plan: 'Growth Plan', amount: 12345, rawRenewalDate: '2099-11-01' }],
  recentPlatformActivities: [{ rawDate: '2026-10-27T09:00:00Z', action: 'Facility approved for trial', who: { name: 'Isolated actor' }, facility: 'Isolated facility', metadata: { secret: 'private-test-metadata' } }],
  facilityReviewAlert: { pendingCount: 2, facilityName: 'Isolated facility', certificateUrl: 'private-certificate' },
})
async function prepare(page, handler) {
  await page.addInitScript(token => sessionStorage.setItem('medtrailSuperAdminSession', JSON.stringify({ token })), jwt)
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/profile') return route.fulfill({ json: { id: 'overview-test', role: 'super_admin', isEmailVerified: true, name: 'Isolated account' } })
    if (path === '/api/super-admin/dashboard') return handler(route)
    return route.abort()
  })
}

for (const width of [375, 1440]) {
  test(`Overview maps API records and suppresses demo metrics at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await prepare(page, route => {
      expect(route.request().headers().authorization).toBe(`Bearer ${jwt}`)
      return route.fulfill({ json: dashboard() })
    })
    await page.goto('/super-admin/overview')
    await expect(page.getByText('2 facility applications awaiting review (Isolated facility).', { exact: true })).toBeVisible()
    await expect(page.getByText('2 pending applications', { exact: true })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Upcoming subscription renewals' })).toContainText('Isolated facility')
    await expect(page.getByRole('table')).toContainText('Facility approved for trial')
    await expect(page.getByRole('table')).toContainText('Isolated actor')
    const cards = page.locator('[data-overview-card="statistics"] article')
    await expect(cards).toHaveCount(4)
    for (const card of await cards.all()) await expect(card).toContainText('—')
    await expect(page.locator('[data-overview-card="revenue"]')).toContainText('No revenue data available.')
    await expect(page.getByRole('img', { name: /Monthly recurring revenue bar chart/ })).toHaveCount(0)
    await page.getByRole('tab', { name: 'Plan Mix' }).click()
    await expect(page.getByText('No plan distribution data available.')).toBeVisible()
    await expect(page.getByRole('progressbar')).toHaveCount(0)
    await expect(page.getByText('Operational', { exact: true })).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('private-test-metadata')
    await expect(page.locator('body')).not.toContainText('private-certificate')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('loading, network failure and retry retain the existing section layout', async ({ page }) => {
  let mode = 'loading', release
  const gate = new Promise(resolve => { release = resolve })
  await prepare(page, async route => {
    if (mode === 'loading') { await gate; return route.abort() }
    return route.fulfill({ json: dashboard() })
  })
  await page.goto('/super-admin/overview')
  await expect(page.getByText('Loading facility applications...')).toBeVisible()
  await expect(page.locator('[data-overview-card="statistics"] article')).toHaveCount(4)
  release()
  await expect(page.getByText('Unable to load facility applications.')).toBeVisible()
  mode = 'ready'
  await page.getByRole('button', { name: 'Try again', exact: true }).first().click()
  await expect(page.getByText('2 pending applications')).toBeVisible()
})

test('empty data introduces no records or invented zero totals', async ({ page }) => {
  await prepare(page, route => route.fulfill({ json: { stats: { registeredFacilities: { awaitingReview: 0 } }, upcomingRenewals: [], recentPlatformActivities: [], facilityReviewAlert: null } }))
  await page.goto('/super-admin/overview')
  await expect(page.getByText('No facility applications awaiting review.')).toBeVisible()
  await expect(page.getByText('No renewal data available.')).toBeVisible()
  await expect(page.getByText('No activity data available.')).toBeVisible()
  await expect(page.getByText('0 pending applications')).toBeVisible()
})

for (const status of [401, 403]) {
  test(`dashboard ${status} clears the Super Admin session`, async ({ page }) => {
    await prepare(page, route => route.fulfill({ status, json: { message: 'private-error' } }))
    await page.goto('/super-admin/overview')
    await expect(page).toHaveURL(/\/super-admin\/login$/)
    expect(await page.evaluate(() => sessionStorage.getItem('medtrailSuperAdminSession'))).toBeNull()
    await expect(page.locator('body')).not.toContainText('private-error')
  })
}

test('preview makes no backend requests', async ({ page }) => {
  const requests = []
  await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
  await page.goto('/super-admin/preview/overview')
  await expect(page.getByRole('heading', { name: 'Platform overview' })).toBeVisible()
  expect(requests).toEqual([])
})
