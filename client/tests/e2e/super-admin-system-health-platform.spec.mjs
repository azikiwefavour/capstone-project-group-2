import { test, expect } from '@playwright/test'

for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 414, height: 896 }, { width: 430, height: 932 }, { width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
  test(`empty Platform filters, incident panel and layout at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/super-admin/preview/system-health')
    const platform = page.getByRole('region', { name: 'Platform', exact: true })
    await expect(platform.getByText('Last 30 days', { exact: true })).toBeVisible()
    await expect(platform.getByRole('columnheader')).toHaveText(['Reference', 'Uptime', 'Response', 'Status'])
    await expect(platform.getByRole('columnheader').locator('svg')).toHaveCount(4)
    await expect(platform.getByRole('rowheader')).toHaveCount(0)
    await expect(platform.locator('tbody tr')).toHaveCount(1)
    const filter = platform.getByRole('combobox', { name: 'Platform status', exact: true })
    await expect(filter).toHaveValue('all')
    for (const value of ['operational', 'degraded', 'all']) {
      await filter.selectOption(value)
      await expect(platform.getByText('No monitoring data available yet.', { exact: true })).toBeVisible()
      await expect(platform.getByRole('rowheader')).toHaveCount(0)
    }
    const incidents = page.locator('[data-system-health-incidents]')
    await expect(incidents.getByRole('listitem')).toHaveCount(0)
    await expect(incidents.getByText('No incident data available yet.', { exact: true })).toBeVisible()
    await expect(incidents.getByText('Period unavailable', { exact: true })).toBeVisible()
    await expect(incidents).toHaveCSS('background-color', 'rgb(238, 240, 244)')
    await expect(incidents.locator('[data-health-incidents-empty]')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(incidents.locator('time')).toHaveCount(0)
    await expect(incidents.locator('button, select, a, input')).toHaveCount(0)
    const content = page.getByRole('region', { name: 'System Health content', exact: true })
    if (viewport.width >= 1024) {
      expect(await content.evaluate(node => node.scrollHeight <= node.clientHeight)).toBe(true)
      expect((await platform.boundingBox()).height).toBeGreaterThanOrEqual(296)
      await expect(incidents).toBeInViewport()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (viewport.width < 560) expect(await platform.getByRole('region', { name: 'Platform table' }).evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`system-health-empty-${viewport.width}.png`), fullPage: true })
    expect(errors).toEqual([])
  })
}

async function mountHealth(page, mode = 'ready') {
  await page.goto('/super-admin/preview/system-health')
  await page.evaluate(async mode => {
    const [{ default: React }, { default: ReactDOM }, { default: Harness }, { healthTestData }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/tests/fixtures/SystemHealthHarness.jsx'), import('/tests/fixtures/systemHealthData.js'),
    ])
    document.getElementById('root').hidden = true
    const node = document.createElement('div'); node.dataset.testid = 'isolated-health'; document.body.append(node)
    const root = ReactDOM.createRoot(node)
    let data = structuredClone(healthTestData)
    if (mode === 'resolved') data.incidents = data.incidents.map(incident => ({ ...incident, status: 'Resolved' }))
    if (mode === 'operational') data.services = data.services.map(service => ({ ...service, status: 'operational' }))
    if (mode === 'statuses') data.incidents = ['Investigating', 'Identified', 'Monitoring', 'Resolved'].map((status, id) => ({ ...data.incidents[0], id: `test-${id}`, status }))
    if (mode === 'empty') data = { services: [], incidents: [] }
    if (mode === 'malformed') data = { services: [null, {}, { id: 'incomplete' }], incidents: [null] }
    if (mode === 'unavailable') data = undefined
    if (mode === 'zero') data = { services: [{ ...data.services[0], monitoring: { availableSeconds: 0, totalSeconds: 10 }, responseTimesMs: [0] }], webhooks: { successful: 0, totalProcessed: 10 }, incidents: [] }
    window.renderHealthState = (status, nextData = data) => root.render(React.createElement(Harness, { state: { status, data: nextData } }))
    window.renderHealthState(mode === 'unavailable' ? 'unavailable' : 'ready')
  }, mode)
  return page.getByTestId('isolated-health')
}

for (const mode of ['resolved', 'operational', 'statuses', 'empty', 'unavailable', 'malformed']) {
  test(`supplied ${mode} monitoring stays safe and preserves incident semantics`, async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const host = await mountHealth(page, mode), incidents = host.locator('[data-system-health-incidents]'), platform = host.locator('[data-system-health-platform]')
    const count = host.getByRole('article', { name: 'Open incidents', exact: true }).locator('p').first()
    if (mode === 'resolved' || mode === 'empty') {
      await expect(count).toHaveText('0')
      await expect(incidents.getByText('No open incidents.', { exact: true })).toBeVisible()
    } else if (mode === 'operational') {
      await expect(host.getByRole('alert')).toHaveCount(0)
      await expect(count).toHaveText('1')
      await platform.getByRole('combobox').selectOption('degraded')
      await expect(platform.getByText('No services match this status.', { exact: true })).toBeVisible()
    } else if (mode === 'statuses') {
      await expect(count).toHaveText('3')
      await expect(incidents.getByRole('listitem')).toHaveCount(3)
      for (const status of ['Investigating', 'Identified', 'Monitoring']) await expect(incidents.getByText(status, { exact: true })).toBeVisible()
    } else {
      await expect(count).toHaveText('—')
      await expect(incidents.getByText('No incident data available yet.', { exact: true })).toBeVisible()
      await expect(platform.getByText('No monitoring data available yet.', { exact: true })).toBeVisible()
      await expect(host.getByRole('region', { name: 'System Health summary' }).getByText('—', { exact: true })).toHaveCount(8)
    }
    expect(errors).toEqual([])
  })
}

test('supplied success data retains metrics, filters, badges and reporting dates', async ({ page }) => {
  const host = await mountHealth(page)
  const platform = host.locator('[data-system-health-platform]'), rows = platform.locator('tbody tr'), incidents = host.locator('[data-system-health-incidents]')
  await expect(rows).toHaveCount(6)
  await expect(host.getByRole('article', { name: 'API uptime - 30 days' }).locator('p').first()).toHaveText('80.00%')
  await expect(host.getByRole('article', { name: 'API response time' }).locator('p').first()).toHaveText('15 ms')
  await expect(host.getByRole('article', { name: 'Payment webhooks' }).locator('p').first()).toHaveText('75.0%')
  await expect(host.getByText('Target 90%', { exact: true })).toBeVisible()
  await expect(host.getByText('75% of requests faster', { exact: true })).toBeVisible()
  await expect(host.getByText('0 resolved this month', { exact: true })).toBeVisible()
  await expect(host.getByRole('alert')).toHaveText('1 service degraded: Test SMS. Facilities and Patients may experience delays.')
  await expect(rows.first().getByText('Operational', { exact: true })).toHaveCSS('background-color', 'rgb(208, 231, 220)')
  await expect(rows.nth(4).getByText('Degraded', { exact: true })).toHaveCSS('background-color', 'rgb(255, 244, 229)')
  const summary = await host.getByRole('region', { name: 'System Health summary' }).innerText()
  for (const [filter, count] of [['operational', 5], ['degraded', 1], ['all', 6]]) {
    await platform.getByRole('combobox').selectOption(filter)
    await expect(rows).toHaveCount(count)
    expect(await host.getByRole('region', { name: 'System Health summary' }).innerText()).toBe(summary)
  }
  await expect(incidents.getByText('February 2027', { exact: true })).toBeVisible()
  await expect(incidents.getByText('Isolated delivery incident', { exact: true })).toBeVisible()
  await expect(incidents.getByText('Service: Test SMS', { exact: true })).toBeVisible()
  await expect(incidents.getByText('Investigating', { exact: true })).toBeVisible()
  await expect(incidents.locator('time')).toHaveAttribute('datetime', '2027-02-10T10:00:00Z')
})

test('loading and error states hide stale monitoring; missing collections never become confirmed zero', async ({ page }) => {
  const errors = [], requests = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
  const host = await mountHealth(page)
  for (const [status, prefix] of [['loading', 'Loading'], ['error', 'Unable to load']]) {
    await page.evaluate(status => window.renderHealthState(status), status)
    const suffix = status === 'loading' ? '...' : '.'
    await expect(host.getByText(`${prefix} monitoring data${suffix}`, { exact: true })).toBeVisible()
    await expect(host.getByText(`${prefix} incident data${suffix}`, { exact: true })).toBeVisible()
    await expect(host.getByRole('region', { name: 'System Health summary' }).getByText('—', { exact: true })).toHaveCount(8)
    await expect(host.locator('[data-system-health-platform] [data-service-name]')).toHaveCount(0)
    await expect(host.locator('[data-system-health-incidents] time')).toHaveCount(0)
    await expect(host.getByRole('button', { name: 'Run checks now' })).toBeDisabled()
  }
  await page.evaluate(() => window.renderHealthState('ready', {}))
  await expect(host.getByRole('article', { name: 'Open incidents', exact: true }).locator('p').first()).toHaveText('—')
  await expect(host.getByText('No incident data available yet.', { exact: true })).toBeVisible()
  expect(errors).toEqual([]); expect(requests).toEqual([])
})

test('confirmed zero metrics and an explicit reporting period are supported', async ({ page }) => {
  const host = await mountHealth(page, 'zero')
  await expect(host.getByRole('article', { name: 'API uptime - 30 days' }).locator('p').first()).toHaveText('0.00%')
  await expect(host.getByRole('article', { name: 'API response time' }).locator('p').first()).toHaveText('0 ms')
  await expect(host.getByRole('article', { name: 'Payment webhooks' }).locator('p').first()).toHaveText('0.0%')
  await expect(host.getByRole('article', { name: 'Open incidents', exact: true }).locator('p').first()).toHaveText('0')
  await page.evaluate(() => window.renderHealthState('ready', { reportingPeriod: '2027-03-01T00:00:00Z', incidents: [] }))
  await expect(host.getByText('March 2027', { exact: true })).toBeVisible()
})

test('short desktop retains one natural scroll area without clipping the empty sections', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 450 })
  await page.goto('/super-admin/preview/system-health')
  const content = page.getByRole('region', { name: 'System Health content', exact: true })
  expect(await content.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true)
  const message = page.getByText('No incident data available yet.', { exact: true })
  await message.scrollIntoViewIfNeeded(); await expect(message).toBeInViewport()
  const scrolling = await content.evaluate(root => [root, ...root.querySelectorAll('*')].filter(node => node.scrollHeight > node.clientHeight + 1 && ['auto', 'scroll'].includes(getComputedStyle(node).overflowY)).map(node => node.getAttribute('aria-label')))
  expect(scrolling).toEqual(['System Health content'])
})
