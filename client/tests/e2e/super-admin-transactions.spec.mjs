import { test, expect } from '@playwright/test'

for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 414, height: 896 }, { width: 430, height: 932 }, { width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
  test(`empty transactions and Payments layout at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const errors = [], requests = [], downloads = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('download', download => downloads.push(download.suggestedFilename()))
    await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
    await page.goto('/super-admin/preview/payments')
    const summary = page.getByRole('region', { name: 'Payment summary', exact: true })
    await expect(summary.getByRole('article', { name: 'Collected (last 90 days)', exact: true }).getByText('—', { exact: true })).toBeVisible()
    await expect(summary.getByRole('article', { name: 'Upcoming payments', exact: true }).getByText('—', { exact: true })).toBeVisible()
    await expect(summary.getByRole('article', { name: 'Failed charges', exact: true }).getByText('—', { exact: true })).toBeVisible()
    const section = page.getByRole('region', { name: 'Transactions', exact: true }), table = section.getByRole('table')
    await expect(table.getByRole('columnheader')).toHaveText(['Reference', 'Facility', 'Amount', 'Channel', 'Gateway', 'Date', 'Status'])
    await expect(table.locator('tbody tr')).toHaveCount(1)
    await expect(table.getByText('No payment transactions available yet.', { exact: true })).toBeVisible()
    await expect(table.locator('time')).toHaveCount(0)
    await expect(table).not.toContainText(/TXN-2026|Sample |Preview Hospital|Flutterwave/)
    const pagination = page.getByRole('navigation', { name: 'Transactions pagination' })
    await expect(section.getByText('Page 1 of 1', { exact: true })).toBeVisible()
    await expect(pagination.getByRole('button')).toHaveCount(2)
    for (const button of await pagination.getByRole('button').all()) await expect(button).toBeDisabled()
    await expect(section.getByRole('button', { name: 'Rows per page: 7, fixed' })).toBeDisabled()
    await expect(section.getByRole('button', { name: 'Rows per page: 7, fixed' })).toHaveText('7 / page')
    const exportButton = section.getByRole('button', { name: 'Export list', exact: true })
    await expect(exportButton).toBeDisabled()
    await exportButton.scrollIntoViewIfNeeded()
    const exportBounds = await exportButton.boundingBox()
    await page.mouse.click(exportBounds.x + exportBounds.width / 2, exportBounds.y + exportBounds.height / 2)
    await table.locator('tbody tr').first().getByRole('cell').first().click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(table.getByRole('button')).toHaveCount(0)
    await expect(table.getByRole('checkbox')).toHaveCount(0)
    await expect(section.getByRole('searchbox')).toHaveCount(0)
    await expect(section.getByRole('button', { name: /filter|sort|edit|refund|retry|delete/i })).toHaveCount(0)
    const scroll = section.getByRole('region', { name: 'Transactions table', exact: true })
    if (viewport.width < 1024) {
      await scroll.scrollIntoViewIfNeeded()
      expect(await scroll.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true)
      await scroll.evaluate(node => { node.scrollLeft = node.scrollWidth })
      await expect(table.getByRole('columnheader', { name: 'Status', exact: true })).toBeInViewport()
      await scroll.evaluate(node => { node.scrollLeft = 0 })
    }
    if (viewport.width >= 1280) {
      const content = page.getByRole('region', { name: 'Payments content', exact: true })
      expect(await content.evaluate(node => node.scrollHeight <= node.clientHeight)).toBe(true)
      await expect(table.locator('tbody tr').last()).toBeInViewport()
      await expect(pagination).toBeInViewport()
      const body = await table.locator('tbody').boundingBox()
      const message = await table.getByText('No payment transactions available yet.', { exact: true }).evaluate(node => {
        const range = document.createRange(); range.selectNodeContents(node)
        const rect = range.getBoundingClientRect()
        return { y: rect.y, height: rect.height }
      })
      expect(body.height).toBeGreaterThan(150)
      expect(Math.abs(message.y + message.height / 2 - body.y - body.height / 2)).toBeLessThan(2)
      const cardBounds = await section.locator('[data-transactions-card]').boundingBox()
      const footerBounds = await section.locator('.subscriber-pagination').boundingBox()
      expect(Math.abs(cardBounds.y + cardBounds.height - footerBounds.y - footerBounds.height - 1)).toBeLessThan(1)
      const bottom = await content.evaluate(node => ({ gap: node.getBoundingClientRect().bottom - node.querySelector('[data-transactions-card]').getBoundingClientRect().bottom, padding: parseFloat(getComputedStyle(node).paddingBottom) }))
      expect(Math.abs(bottom.gap - bottom.padding)).toBeLessThan(1)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('script[src*="paystack"], script[src*="flutterwave"], iframe')).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath(`transactions-${viewport.width}.png`), fullPage: true })
    expect(errors).toEqual([]); expect(requests).toEqual([]); expect(downloads).toEqual([])
  })
}

test('pagination state supports future page counts without adding any sample transactions', async ({ page }) => {
  await page.goto('/super-admin/preview/payments')
  await page.evaluate(async () => {
    const [{ default: React }, { default: ReactDOM }, { default: Pagination }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/src/super-admin/SuperAdminPagination.jsx'),
    ])
    const node = document.createElement('div'); node.dataset.testid = 'isolated-pagination'; node.setAttribute('data-super-admin-transactions', ''); document.body.append(node)
    const root = ReactDOM.createRoot(node)
    const renderPage = page => root.render(React.createElement(Pagination, { page, totalPages: 3, empty: false, onChange: renderPage, label: 'Isolated pagination' }))
    renderPage(1)
  })
  const fixture = page.getByTestId('isolated-pagination')
  await expect(fixture.getByText('Page 1 of 3', { exact: true })).toBeVisible()
  await fixture.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(fixture.getByText('Page 2 of 3', { exact: true })).toBeVisible()
  await fixture.getByRole('button', { name: 'Last page', exact: true }).click()
  await expect(fixture.getByText('Page 3 of 3', { exact: true })).toBeVisible()
  await expect(fixture.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
  await fixture.getByRole('button', { name: 'First page', exact: true }).click()
  await fixture.getByRole('button', { name: 'Page 2', exact: true }).click()
  await expect(fixture.getByText('Page 2 of 3', { exact: true })).toBeVisible()
  await fixture.getByRole('button', { name: 'Previous page', exact: true }).click()
  await expect(fixture.getByText('Page 1 of 3', { exact: true })).toBeVisible()
  await expect(page.getByText('No payment transactions available yet.', { exact: true })).toBeVisible()
})

test('empty and unconnected transaction states never fall back to mock records', async ({ page }) => {
  await page.goto('/super-admin/preview/payments')
  await page.evaluate(async () => {
    const [{ default: React }, { default: ReactDOM }, { default: Table }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/src/super-admin/TransactionsTable.jsx'),
    ])
    const node = document.createElement('div'); node.dataset.testid = 'isolated-transactions'; document.body.append(node)
    const root = ReactDOM.createRoot(node)
    window.renderTransactionsFixture = records => root.render(React.createElement(Table, { records }))
    window.renderTransactionsFixture([])
  })
  const fixture = page.getByTestId('isolated-transactions')
  await expect(fixture.getByText('No payment transactions available yet.', { exact: true })).toBeVisible()
  for (const button of await fixture.getByRole('navigation').getByRole('button').all()) await expect(button).toBeDisabled()
  await page.evaluate(() => window.renderTransactionsFixture())
  await expect(fixture.getByText('No payment transactions available yet.', { exact: true })).toBeVisible()
  await expect(fixture.getByRole('cell', { name: /^TXN-/ })).toHaveCount(0)
})

test('supplied payment state supports loading, errors, zero totals and seven-row pagination', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/super-admin/preview/payments')
  await page.evaluate(async () => {
    const [{ default: React }, { default: ReactDOM }, { default: PaymentsHarness }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/tests/fixtures/PaymentsHarness.jsx'),
    ])
    document.getElementById('root').hidden = true
    const node = document.createElement('div'); node.dataset.testid = 'payment-state'; document.body.append(node)
    const root = ReactDOM.createRoot(node)
    // Isolated test input only; never imported by the application.
    const records = Array.from({ length: 8 }, (_, index) => ({ reference: `test-${index}`, facilityName: `Test facility ${index}`, amount: 0, channel: 'Card', gateway: 'Paystack', date: '2026-01-01', status: ['successful', 'pending', 'failed'][index % 3] }))
    const summary = { collectedLast90Days: 0, upcomingNext30Days: 0, failedCharges: 0 }
    window.renderPaymentState = status => root.render(React.createElement(PaymentsHarness, { state: { status, records, summary } }))
    window.renderPaymentState('empty')
  })
  const host = page.getByTestId('payment-state'), table = host.getByRole('table'), summary = host.getByRole('region', { name: 'Payment summary' })
  const footer = host.locator('.subscriber-pagination')
  await expect(table.getByText('No payment transactions available yet.', { exact: true })).toBeVisible()
  const emptyFooter = await footer.boundingBox()
  for (const [status, message] of [['loading', 'Loading payment transactions...'], ['error', 'Unable to load payment transactions.']]) {
    await page.evaluate(status => window.renderPaymentState(status), status)
    await expect(table.getByText(message, { exact: true })).toBeVisible()
    await expect(summary.getByText('—', { exact: true })).toHaveCount(3)
    await expect(table.locator('time')).toHaveCount(0)
  }
  await page.evaluate(() => window.renderPaymentState('ready'))
  await expect(summary.getByText('₦0', { exact: true })).toHaveCount(2)
  await expect(summary.getByText('0', { exact: true })).toHaveCount(1)
  await expect(table.locator('tbody tr')).toHaveCount(7)
  await expect(host.getByText('Page 1 of 2', { exact: true })).toBeVisible()
  for (const [status, color] of [['Successful', 'rgb(208, 231, 220)'], ['Pending', 'rgb(255, 244, 206)'], ['Failed', 'rgb(248, 214, 221)']]) {
    await expect(table.getByText(status, { exact: true }).first()).toHaveCSS('background-color', color)
  }
  const populatedFooter = await footer.boundingBox()
  expect(Math.abs(populatedFooter.y - emptyFooter.y)).toBeLessThan(1)
  await host.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(host.getByText('Page 2 of 2', { exact: true })).toBeVisible()
  await expect(table.locator('tbody tr')).toHaveCount(1)
  await host.getByRole('button', { name: 'Previous page', exact: true }).click()
  await expect(table.locator('tbody tr')).toHaveCount(7)
})
