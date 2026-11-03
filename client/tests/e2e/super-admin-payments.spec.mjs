import { test, expect } from '@playwright/test'

for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 414, height: 896 }, { width: 430, height: 932 }, { width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
  test(`Payments unavailable summary and navigation at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const errors = [], requests = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
    await page.goto('/super-admin/preview/overview')
    const nav = page.getByRole('navigation', { name: 'Super Admin navigation' })
    await nav.getByRole('link', { name: 'Payments', exact: true }).click()
    await expect(page).toHaveURL(/\/super-admin\/preview\/payments$/)
    await expect(nav.getByRole('link', { name: 'Payments', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Payments', exact: true })).toHaveCSS('color', 'rgb(71, 90, 162)')
    const content = page.getByRole('region', { name: 'Payments content', exact: true })
    await expect(content.getByRole('heading', { name: 'Payments', exact: true })).toBeVisible()
    await expect(content.getByText('Gateways that collect naira subscription payments, and every transaction they process.', { exact: true })).toBeVisible()
    await expect(page.getByRole('status')).toContainText('no active login, payment data or gateway connection')
    const gateway = content.locator('[data-payments-heading]').getByText('Paystack', { exact: true })
    await expect(gateway).toBeVisible()
    const summary = page.getByRole('region', { name: 'Payment summary', exact: true })
    await expect(summary.getByRole('article')).toHaveCount(3)
    const items = [
      ['Collected (last 90 days)', '—', 'Successful subscription payments received.'],
      ['Upcoming payments', '—', 'Expected subscription payments in the next 30 days.'],
      ['Failed charges', '—', 'Unsuccessful payment attempts.'],
    ]
    const boxes = []
    for (const [label, value, description] of items) {
      const card = summary.getByRole('article', { name: label, exact: true })
      await expect(card.getByRole('heading', { name: label, exact: true })).toBeVisible()
      await expect(card.getByText(value, { exact: true })).toBeVisible()
      await expect(card.getByText(description, { exact: true })).toBeVisible()
      await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)')
      boxes.push(await card.boundingBox())
    }
    expect(Math.max(...boxes.map(box => box.height)) - Math.min(...boxes.map(box => box.height))).toBeLessThan(1)
    if (viewport.width >= 768) {
      expect(boxes.map(box => box.y)).toEqual([boxes[0].y, boxes[0].y, boxes[0].y])
      expect(boxes[1].x).toBeGreaterThan(boxes[0].x + boxes[0].width)
      expect(boxes[2].x).toBeGreaterThan(boxes[1].x + boxes[1].width)
      expect(boxes[0].height).toBeLessThan(190)
    } else expect(boxes[1].y).toBeGreaterThan(boxes[0].y + boxes[0].height)
    if (viewport.width >= 1024) {
      if (viewport.width >= 1280) expect(await content.evaluate(node => node.scrollHeight <= node.clientHeight)).toBe(true)
      const heading = await content.getByRole('heading', { name: 'Payments', exact: true }).boundingBox(), badge = await gateway.boundingBox()
      expect(badge.x).toBeGreaterThanOrEqual(heading.x + heading.width)
      expect(Math.abs(badge.y - heading.y)).toBeLessThan(1)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(content.getByRole('region', { name: 'Transactions', exact: true }).getByRole('table')).toHaveCount(1)
    await expect(content.getByRole('searchbox')).toHaveCount(0)
    await expect(content.getByRole('button', { name: /filter|sort|gateway/i })).toHaveCount(0)
    await expect(content.getByRole('combobox')).toHaveCount(0)
    await expect(page.locator('script[src*="paystack"], script[src*="flutterwave"], iframe')).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath(`payments-${viewport.width}.png`), fullPage: true })
    const sessions = await page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage } }))
    await page.getByRole('button', { name: 'Log out', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Yes, Log out', exact: true }).click()
    expect(await page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage } }))).toEqual(sessions)
    await nav.getByRole('link', { name: 'Subscriptions', exact: true }).click()
    await expect(page.getByRole('article', { name: 'Starter Plan', exact: true })).toBeVisible()
    await expect(page.getByText('No subscriptions available yet.', { exact: true })).toBeVisible()
    await nav.getByRole('link', { name: 'Facilities', exact: true }).click()
    await expect(page.getByText('No facilities available yet.', { exact: true })).toBeVisible()
    await nav.getByRole('link', { name: 'Overview', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Platform overview', exact: true })).toBeVisible()
    expect(errors).toEqual([]); expect(requests).toEqual([])
  })
}

test('payment summaries distinguish unavailable values from confirmed zero without transactions', async ({ page }) => {
  await page.goto('/super-admin/preview/payments')
  await page.evaluate(async () => {
    const [{ default: React }, { default: ReactDOM }, { default: Cards }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/src/super-admin/PaymentSummaryCards.jsx'),
    ])
    const node = document.createElement('div'); node.dataset.testid = 'isolated-payment-summary'; document.body.append(node)
    const root = ReactDOM.createRoot(node)
    window.renderPaymentSummaryFixture = summary => root.render(React.createElement(Cards, { summary }))
    window.renderPaymentSummaryFixture()
  })
  const fixture = page.getByTestId('isolated-payment-summary')
  await expect(fixture.getByText('—', { exact: true })).toHaveCount(3)
  await page.evaluate(() => window.renderPaymentSummaryFixture({ collectedLast90Days: 0, upcomingNext30Days: 0, failedCharges: 0 }))
  await expect(fixture.getByText('₦0', { exact: true })).toHaveCount(2)
  await expect(fixture.getByText('0', { exact: true })).toHaveCount(1)
  await page.evaluate(() => window.renderPaymentSummaryFixture({ collectedLast90Days: -1, upcomingNext30Days: '70000', failedCharges: 1.5 }))
  await expect(fixture.getByText('—', { exact: true })).toHaveCount(3)
})
