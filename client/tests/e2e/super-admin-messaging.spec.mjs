import { test, expect } from '@playwright/test'

for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 414, height: 896 }, { width: 430, height: 932 }, { width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
  test(`Messaging unavailable metrics, panels and navigation at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const errors = [], requests = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
    await page.goto('/super-admin/preview/overview')
    const nav = page.getByRole('navigation', { name: 'Super Admin navigation' })
    await nav.getByRole('link', { name: 'Messaging', exact: true }).click()
    await expect(page).toHaveURL(/\/super-admin\/preview\/messaging$/)
    await expect(nav.getByRole('link', { name: 'Messaging', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { name: 'Messaging', exact: true })).toBeVisible()
    await expect(page.getByText('SMS and WhatsApp messages sent to patients and staff through Termii.', { exact: true })).toBeVisible()
    await expect(page.locator('[data-messaging-heading]').getByText('Termii', { exact: true })).toBeVisible()
    await expect(page.getByRole('status')).toContainText('no active login, messaging data or Termii connection')
    const currentMonth = new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(new Date())
    const summary = page.getByRole('region', { name: 'Messaging summary', exact: true })
    await expect(summary.getByRole('article')).toHaveCount(4)
    for (const [label, support] of [[`Sent in ${currentMonth}`, '—'], ['Delivery rate', 'WhatsApp: —, SMS: —'], ['Failed', '—'], ['Termii credit', '—']]) {
      const card = summary.getByRole('article', { name: label, exact: true })
      await expect(card.locator('p').first()).toHaveText('—')
      await expect(card.locator('p').last()).toHaveText(support)
    }
    await expect(summary.getByRole('article', { name: 'Failed', exact: true }).locator('p').first()).toHaveCSS('color', 'rgb(184, 63, 92)')
    const boxes = await Promise.all((await summary.getByRole('article').all()).map(card => card.boundingBox()))
    expect(Math.max(...boxes.map(box => box.height)) - Math.min(...boxes.map(box => box.height))).toBeLessThan(1)
    if (viewport.width >= 1024) expect(boxes.map(box => box.y)).toEqual([boxes[0].y, boxes[0].y, boxes[0].y, boxes[0].y])
    const messages = page.getByRole('region', { name: 'Messages', exact: true }), usage = page.getByRole('region', { name: 'Usage', exact: true })
    for (const [index, name, value] of [[0, 'Staff invites', '—'], [1, 'Verification codes', '—'], [2, 'Prescription details', '—']]) {
      const row = messages.getByRole('listitem').nth(index)
      await expect(row.getByRole('heading', { name, exact: true })).toBeVisible()
      await expect(row.getByText(value, { exact: true })).toBeVisible()
    }
    await expect(messages.getByRole('progressbar')).toHaveCount(0)
    await expect(usage.getByText('No facility usage data available yet.', { exact: true })).toBeVisible()
    await expect(usage.getByRole('progressbar')).toHaveCount(0)
    await expect(usage.getByRole('listitem')).toHaveCount(0)
    await expect(messages.locator('li > div:last-child > div')).toHaveCount(0)
    await expect(usage.getByRole('button', { name: 'View all — coming soon', exact: true })).toBeDisabled()
    const mb = await messages.boundingBox(), ub = await usage.boundingBox()
    if (viewport.width >= 1024) { expect(mb.y).toBe(ub.y); expect(ub.x).toBeGreaterThan(mb.x + mb.width) }
    else expect(ub.y).toBeGreaterThan(mb.y)
    const content = page.getByRole('region', { name: 'Messaging content', exact: true })
    if (viewport.height >= 900 && viewport.width >= 1024) expect(await content.evaluate(node => node.scrollHeight <= node.clientHeight)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(content.getByRole('table')).toHaveCount(1)
    await expect(content.getByRole('searchbox')).toHaveCount(0)
    await expect(content.getByRole('button', { name: /filter|export|sort/i })).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath(`messaging-${viewport.width}.png`), fullPage: true })
    await nav.getByRole('link', { name: 'Payments', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Payments', exact: true })).toBeVisible()
    await expect(page.getByText('No payment transactions available yet.', { exact: true })).toBeVisible()
    await nav.getByRole('link', { name: 'Subscriptions', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Subscribers', exact: true })).toBeVisible()
    await nav.getByRole('link', { name: 'Facilities', exact: true }).click()
    await expect(page.getByText('No facilities available yet.', { exact: true })).toBeVisible()
    await nav.getByRole('link', { name: 'Overview', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Platform overview', exact: true })).toBeVisible()
    expect(errors).toEqual([]); expect(requests).toEqual([])
  })
}

test('current/previous months roll over while the preview stays open, including a new year', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-12-31T23:59:40Z') })
  await page.goto('/super-admin/preview/messaging')
  await expect(page.getByRole('article', { name: 'Sent in December', exact: true }).locator('p').first()).toHaveText('—')
  await page.clock.fastForward(61000)
  await expect(page.getByRole('article', { name: 'Sent in January', exact: true }).locator('p').last()).toHaveText('—')
  await expect(page.getByRole('article', { name: 'Sent in January', exact: true }).locator('p').first()).toBeVisible()
})

test('unlimited usage has no percentage or invented limit', async ({ page }) => {
  await page.goto('/super-admin/preview/messaging')
  await page.evaluate(async () => {
    const [{ default: React }, { default: ReactDOM }, { MessagingUsagePanel }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/src/super-admin/MessagingPanels.jsx'),
    ])
    const node = document.createElement('div'); node.dataset.testid = 'isolated-unlimited-usage'; document.body.append(node)
    ReactDOM.createRoot(node).render(React.createElement(MessagingUsagePanel, { usage: [{ name: 'Isolated unlimited facility', used: 20, allowance: null }] }))
  })
  const fixture = page.getByTestId('isolated-unlimited-usage')
  await expect(fixture.getByText('20 · Unlimited', { exact: true })).toBeVisible()
  await expect(fixture.getByRole('progressbar')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Usage', exact: true }).first().getByRole('listitem')).toHaveCount(0)
})
