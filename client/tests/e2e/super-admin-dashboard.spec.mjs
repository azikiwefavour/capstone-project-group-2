import { test, expect } from '@playwright/test'

for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 414, height: 896 }, { width: 430, height: 932 }, { width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1440, height: 929 }]) {
  test(`Overview unavailable data, layout and isolated logout at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const errors = [], requests = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
    await page.goto('/super-admin/preview/overview')
    await expect(page.getByRole('heading', { name: 'Platform overview', exact: true })).toBeVisible()
    await expect(page.getByText('How facilities are using MedTrail this month.', { exact: true })).toBeVisible()
    await expect(page.getByRole('status')).toContainText('no active login or platform data')
    const nav = page.getByRole('navigation', { name: 'Super Admin navigation' })
    await expect(nav.getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Audit log', exact: true })).toHaveAttribute('href', '/super-admin/preview/audit-log')
    for (const label of ['Review', 'Open settings']) await expect(page.getByRole('button', { name: label, exact: true })).toBeDisabled()
    await expect(page.getByRole('complementary')).toHaveCSS('background-color', 'rgb(71, 90, 162)')
    const platform = page.getByRole('region', { name: 'Platform statistics', exact: true })
    for (const label of ['Registered Facilities', 'Active Subscribers', 'Messages Sent', 'Patients on Record']) {
      const card = platform.getByRole('article', { name: label, exact: true })
      await expect(card.getByRole('heading', { name: label, exact: true })).toBeVisible()
      await expect(card.getByText('—', { exact: true })).toBeVisible()
      await expect(card.getByText('Not connected yet', { exact: true })).toBeVisible()
    }
    const revenue = page.getByRole('region', { name: 'Revenue and Plan Mix', exact: true })
    await expect(revenue.getByRole('heading', { name: 'Monthly recurring revenue' })).toBeVisible()
    await expect(revenue.getByText('—', { exact: true })).toBeVisible()
    await expect(revenue.getByText('No revenue data available.', { exact: true })).toBeVisible()
    await expect(revenue.getByRole('img')).toHaveCount(0)
    await revenue.getByRole('tab', { name: 'Plan Mix', exact: true }).click()
    await expect(revenue.getByRole('heading', { name: 'Active hospital subscriptions' })).toBeVisible()
    await expect(revenue.getByText('No plan distribution data available.', { exact: true })).toBeVisible()
    await expect(revenue.getByRole('progressbar')).toHaveCount(0)
    await revenue.getByRole('tab', { name: 'Plan Mix', exact: true }).press('ArrowLeft')
    await expect(revenue.getByRole('tab', { name: 'Revenue', exact: true })).toHaveAttribute('aria-selected', 'true')
    const cards = await Promise.all((await platform.getByRole('article').all()).map(card => card.boundingBox()))
    expect(cards[0].y).toBe(cards[1].y); expect(cards[2].y).toBe(cards[3].y)
    const revenueBox = await revenue.boundingBox(), platformBox = await platform.boundingBox()
    if (viewport.width >= 1280) { expect(platformBox.x).toBeGreaterThan(revenueBox.x + revenueBox.width); expect(platformBox.y).toBe(revenueBox.y) }
    else expect(platformBox.y).toBeGreaterThan(revenueBox.y)
    const renewals = page.getByRole('region', { name: 'Upcoming renewals', exact: true }), integrations = page.getByRole('region', { name: 'Integrations', exact: true })
    await expect(renewals.getByText('No renewal data available.', { exact: true })).toBeVisible()
    await expect(renewals.getByRole('listitem')).toHaveCount(0)
    await expect(renewals.getByRole('button', { name: 'View all — coming soon', exact: true })).toBeDisabled()
    await expect(integrations.getByText('Unavailable', { exact: true })).toHaveCount(4)
    await expect(integrations.getByText('Operational', { exact: true })).toHaveCount(0)
    for (const label of ['MedTrail API', 'Paystack', 'Termii SMS', 'Termii WhatsApp']) await expect(integrations.getByRole('heading', { name: label, exact: true })).toBeVisible()
    const activities = page.getByRole('region', { name: 'Recent platform activities', exact: true })
    await expect(activities.getByRole('columnheader')).toHaveText(['When', 'Who', 'Action', 'Facility'])
    await expect(activities.getByText('No activity data available.', { exact: true })).toBeVisible()
    await expect(activities.locator('time')).toHaveCount(0)
    await expect(activities.getByRole('button', { name: 'View all — coming soon', exact: true })).toBeDisabled()
    const content = page.getByRole('region', { name: 'Platform overview content', exact: true })
    await expect(content.getByRole('alert')).toHaveCount(0)
    await expect(content.getByText(/₦|Preview Hospital|Preview operator|Sample platform|Sample renewals|Sample service|Sample activities|Sample data/)).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const storage = await page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage } }))
    for (const close of ['Cancel', 'Close log out confirmation', 'Escape', 'Yes, Log out']) {
      await page.getByRole('button', { name: 'Log out', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      if (close === 'Escape') await page.keyboard.press('Escape')
      else await page.getByRole('button', { name: close, exact: true }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page).toHaveURL(/\/super-admin\/preview\/overview$/)
    }
    expect(await page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage } }))).toEqual(storage)
    expect(errors).toEqual([]); expect(requests).toEqual([])
    await page.screenshot({ path: testInfo.outputPath(`overview-unavailable-${viewport.width}.png`), fullPage: true })
  })
}

test('overview stays protected and preview never consumes an existing role session', async ({ page }) => {
  const session = { token: `test.${Buffer.from(JSON.stringify({ sub: 'isolated-admin', role: 'admin', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`, role: 'admin' }
  await page.addInitScript(session => sessionStorage.setItem('medtrailAdminSession', JSON.stringify(session)), session)
  await page.goto('/super-admin/overview')
  await expect(page).toHaveURL(/\/super-admin\/login$/)
  await page.goto('/super-admin/preview/overview')
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await page.getByRole('button', { name: 'Yes, Log out', exact: true }).click()
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('medtrailAdminSession')))).toEqual(session)
})

// Mount the presentation in an isolated test container; never add test-state routes.
test('statistics presentation distinguishes loading, error/retry, empty and unavailable', async ({ page }) => {
  await page.goto('/super-admin/preview/overview')
  await page.evaluate(async () => {
    const [{ default: React }, { default: ReactDOM }, { default: Card }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'),
      import('/src/super-admin/RevenuePlanMix.jsx'),
    ])
    const container = document.createElement('div')
    container.dataset.testid = 'isolated-statistics'
    document.body.append(container)
    const root = ReactDOM.createRoot(container)
    window.renderStatisticsFixture = status => root.render(React.createElement(Card, { state: { status }, onRetry: () => window.renderStatisticsFixture('empty') }))
    window.renderStatisticsFixture('loading')
  })
  const fixture = page.getByTestId('isolated-statistics')
  await expect(fixture.getByRole('status')).toHaveText('Loading platform statistics...')
  await page.evaluate(() => window.renderStatisticsFixture('error'))
  await expect(fixture.getByRole('alert')).toContainText('Unable to load platform statistics.')
  await fixture.getByRole('button', { name: 'Try again' }).click()
  await expect(fixture.getByText('No revenue data available.', { exact: true })).toBeVisible()
  await page.evaluate(() => window.renderStatisticsFixture('unavailable'))
  await expect(fixture.getByText('No revenue data available.', { exact: true })).toBeVisible()
  await expect(fixture.getByRole('img')).toHaveCount(0)
  await expect(fixture.getByRole('progressbar')).toHaveCount(0)
})


test('platform cards distinguish missing, loading, error/retry, empty and confirmed zero counts', async ({ page }) => {
  await page.goto('/super-admin/preview/overview')
  await page.evaluate(async () => {
    const [{ default: React }, { default: ReactDOM }, { default: Cards }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'),
      import('/src/super-admin/PlatformStatistics.jsx'),
    ])
    const container = document.createElement('div')
    container.dataset.testid = 'isolated-platform'
    document.body.append(container)
    const root = ReactDOM.createRoot(container)
    window.renderPlatformFixture = (status, data) => root.render(React.createElement(Cards, { state: { status, data }, onRetry: () => window.renderPlatformFixture('empty') }))
    window.renderPlatformFixture('loading')
  })
  const fixture = page.getByTestId('isolated-platform')
  await expect(fixture.getByRole('status')).toHaveText('Loading platform statistics...')
  await expect(fixture.getByRole('article').first()).toHaveAttribute('aria-busy', 'true')
  await page.evaluate(() => window.renderPlatformFixture('error'))
  await expect(fixture.getByRole('alert')).toContainText('Unable to load platform statistics.')
  await fixture.getByRole('button', { name: 'Try again' }).click()
  await expect(fixture.getByText('No platform statistics available yet.', { exact: true })).toBeVisible()
  await page.evaluate(() => window.renderPlatformFixture('unavailable'))
  await expect(fixture.getByText('Not connected yet', { exact: true })).toHaveCount(4)
  await expect(fixture.getByText('0', { exact: true })).toHaveCount(0)
  await page.evaluate(() => window.renderPlatformFixture('ready', { registeredFacilities: 0, activeSubscribers: 0, messagesSent: 0, patientsOnRecord: 0 }))
  await expect(fixture.getByText('0', { exact: true })).toHaveCount(4)
  await expect(fixture.getByText('Additional details unavailable', { exact: true })).toHaveCount(4)
})


test('renewals and integrations keep loading, error, empty, malformed and unavailable states honest', async ({ page }) => {
  await page.goto('/super-admin/preview/overview')
  await page.evaluate(async () => {
    const [{ default: React }, { default: ReactDOM }, { default: Renewals }, { default: Integrations }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'),
      import('/src/super-admin/UpcomingRenewals.jsx'), import('/src/super-admin/Integrations.jsx'),
    ])
    const container = document.createElement('div')
    container.dataset.testid = 'isolated-stage4'
    document.body.append(container)
    const root = ReactDOM.createRoot(container)
    window.renderStage4Fixture = (status, data) => {
      const props = { state: { status, data }, onRetry: () => window.renderStage4Fixture('empty') }
      root.render(React.createElement(React.Fragment, null, React.createElement(Renewals, props), React.createElement(Integrations, props)))
    }
    window.renderStage4Fixture('loading')
  })
  const fixture = page.getByTestId('isolated-stage4')
  await expect(fixture.getByRole('status')).toHaveCount(2)
  await page.evaluate(() => window.renderStage4Fixture('error'))
  await expect(fixture.getByRole('alert')).toHaveCount(2)
  await fixture.getByRole('button', { name: 'Try again', exact: true }).first().click()
  await expect(fixture.getByText('No renewal data available.', { exact: true })).toBeVisible()
  await expect(fixture.getByText('No integration health data available.', { exact: true })).toBeVisible()
  await page.evaluate(() => window.renderStage4Fixture('ready', []))
  await expect(fixture.getByText('No renewal data available.', { exact: true })).toBeVisible()
  await expect(fixture.getByText('Unavailable', { exact: true })).toHaveCount(4)
  await page.evaluate(() => window.renderStage4Fixture('ready', {}))
  await expect(fixture.getByRole('alert')).toHaveCount(2)
  await page.evaluate(() => window.renderStage4Fixture('unavailable'))
  await expect(fixture.getByText('No renewal data available.', { exact: true })).toBeVisible()
  await expect(fixture.getByText('Integration health monitoring is not connected yet.', { exact: true })).toBeVisible()
  await expect(fixture.getByText('Unavailable', { exact: true })).toHaveCount(4)
  await expect(fixture.getByText('Operational', { exact: true })).toHaveCount(0)
})


test('activity table distinguishes loading, error/retry, empty, malformed and unavailable states', async ({ page }) => {
  await page.goto('/super-admin/preview/overview')
  await page.evaluate(async () => {
    const [{ default: React }, { default: ReactDOM }, { default: Activities }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/src/super-admin/RecentPlatformActivities.jsx'),
    ])
    const container = document.createElement('div')
    container.dataset.testid = 'isolated-activities'
    document.body.append(container)
    const root = ReactDOM.createRoot(container)
    window.renderActivitiesFixture = (status, data) => root.render(React.createElement(Activities, { state: { status, data }, onRetry: () => window.renderActivitiesFixture('empty') }))
    window.renderActivitiesFixture('loading')
  })
  const fixture = page.getByTestId('isolated-activities')
  await expect(fixture.getByRole('status')).toBeVisible()
  await page.evaluate(() => window.renderActivitiesFixture('error'))
  await expect(fixture.getByRole('alert')).toBeVisible()
  await fixture.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(fixture.getByText('No activity data available.', { exact: true })).toBeVisible()
  await page.evaluate(() => window.renderActivitiesFixture('ready', []))
  await expect(fixture.getByText('No activity data available.', { exact: true })).toBeVisible()
  await page.evaluate(() => window.renderActivitiesFixture('ready', [{ actionType: 'prescription_created', occurredAt: 'invalid', description: 'Private clinical fixture' }]))
  await expect(fixture.getByRole('alert')).toBeVisible()
  await expect(fixture).not.toContainText('Private clinical fixture')
  await page.evaluate(() => window.renderActivitiesFixture('ready', {}))
  await expect(fixture.getByRole('alert')).toBeVisible()
  await page.evaluate(() => window.renderActivitiesFixture('unavailable'))
  await expect(fixture.getByText('No activity data available.', { exact: true })).toBeVisible()
  await expect(fixture.locator('time')).toHaveCount(0)
})


for (const viewport of [{ width: 1280, height: 800 }, { width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1280, height: 400 }]) {
  test(`compact unavailable Overview keeps sections and natural scrolling at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/super-admin/preview/overview')
    const content = page.getByRole('region', { name: 'Platform overview content', exact: true })
    await expect(content.getByText('No activity data available.', { exact: true })).toBeVisible()
    await expect(content.getByRole('region', { name: 'Upcoming renewals', exact: true })).toBeVisible()
    if (viewport.height >= 768) expect(await content.evaluate(n => n.scrollHeight)).toBe(await content.evaluate(n => n.clientHeight))
    await page.getByRole('tab', { name: 'Plan Mix', exact: true }).click()
    await expect(content.getByText('No plan distribution data available.', { exact: true })).toBeVisible()
    await expect(content.getByRole('progressbar')).toHaveCount(0)
    if (viewport.height >= 768) expect(await content.evaluate(n => n.scrollHeight)).toBe(await content.evaluate(n => n.clientHeight))
    const final = content.getByText('No activity data available.', { exact: true })
    await final.scrollIntoViewIfNeeded(); await expect(final).toBeInViewport()
    const scrolling = await content.evaluate(root => [root, ...root.querySelectorAll('*')].filter(n => n.scrollHeight > n.clientHeight + 1 && ['auto', 'scroll'].includes(getComputedStyle(n).overflowY)).map(n => n.getAttribute('aria-label')))
    expect(scrolling).toEqual(viewport.height >= 768 ? [] : ['Platform overview content'])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true)
  })
}

test('isolated revenue presentation safely accepts future partial, zero and populated data', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  await page.goto('/super-admin/preview/overview')
  await page.evaluate(async () => {
    const [{ default: React }, { default: ReactDOM }, { default: Card }] = await Promise.all([import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/src/super-admin/RevenuePlanMix.jsx')])
    const node = document.createElement('div'); node.dataset.testid = 'future-revenue'; document.body.append(node)
    const root = ReactDOM.createRoot(node)
    window.renderFutureRevenue = data => root.render(React.createElement(Card, { state: { status: 'ready', data } }))
    window.renderFutureRevenue({})
  })
  const fixture = page.getByTestId('future-revenue')
  await expect(fixture.getByText('—', { exact: true })).toBeVisible()
  await expect(fixture.getByText('No revenue data available.', { exact: true })).toBeVisible()
  await page.evaluate(() => window.renderFutureRevenue({ monthlyRevenue: 0, months: null }))
  await expect(fixture.getByText('₦0', { exact: true })).toBeVisible()
  await fixture.getByRole('tab', { name: 'Plan Mix' }).click()
  await expect(fixture.getByText('No plan distribution data available.', { exact: true })).toBeVisible()
  await page.evaluate(() => window.renderFutureRevenue({ monthlyRevenue: 500, previousMonthlyRevenue: 400, months: [{ label: 'Jan', amount: 400 }, { label: 'Feb', amount: 500 }], plans: [{ name: 'Starter Plan', count: 2, share: 40 }, { name: 'Growth Plan', count: 3, share: 60 }] }))
  await expect(fixture.getByRole('progressbar')).toHaveCount(2)
  await expect(fixture.getByRole('progressbar').first()).toHaveAttribute('aria-valuenow', '40')
  await fixture.getByRole('tab', { name: 'Revenue' }).click()
  await expect(fixture.getByRole('img')).toHaveAccessibleName(/Jan:.*Feb:/)
  await expect(fixture.getByText('₦500', { exact: true })).toBeVisible()
  await expect(fixture.getByText('+25.0% vs previous month', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('isolated section-state factory supports loading, error, empty and successful data without requests', async ({ page }) => {
  await page.goto('/super-admin/preview/overview')
  await page.evaluate(async () => {
    const [{ default: React }, { default: ReactDOM }, { default: Revenue }, { default: Platform }, { default: Renewals }, { default: Integrations }, { default: Activities }, { createOverviewState }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/src/super-admin/RevenuePlanMix.jsx'), import('/src/super-admin/PlatformStatistics.jsx'), import('/src/super-admin/UpcomingRenewals.jsx'), import('/src/super-admin/Integrations.jsx'), import('/src/super-admin/RecentPlatformActivities.jsx'), import('/src/super-admin/overviewState.js'),
    ])
    const node = document.createElement('div'); node.dataset.testid = 'future-overview-states'; document.body.append(node)
    const root = ReactDOM.createRoot(node)
    window.renderFutureOverview = status => {
      const state = createOverviewState(status)
      if (status === 'ready') for (const field of ['registeredFacilities', 'activeSubscribers', 'messagesSent', 'patientsOnRecord']) state.platformState.data[field] = 0
      root.render(React.createElement(React.Fragment, null, React.createElement(Revenue, { state: state.statisticsState }), React.createElement(Platform, { state: state.platformState }), React.createElement(Renewals, { state: state.renewalsState }), React.createElement(Integrations, { state: state.integrationsState }), React.createElement(Activities, { state: state.activitiesState })))
    }
    window.renderFutureOverview('loading')
  })
  const fixture = page.getByTestId('future-overview-states')
  await expect(fixture.getByRole('status')).toHaveCount(5)
  await page.evaluate(() => window.renderFutureOverview('error'))
  await expect(fixture.getByRole('alert')).toHaveCount(5)
  await page.evaluate(() => window.renderFutureOverview('empty'))
  await expect(fixture.getByRole('alert')).toHaveCount(0)
  await expect(fixture.getByText('No renewal data available.', { exact: true })).toBeVisible()
  await expect(fixture.getByText('No activity data available.', { exact: true })).toBeVisible()
  await page.evaluate(() => window.renderFutureOverview('ready'))
  await expect(fixture.getByText('0', { exact: true })).toHaveCount(4)
  await expect(fixture.getByRole('img')).toHaveCount(0)
  await expect(fixture.getByRole('progressbar')).toHaveCount(0)
})
