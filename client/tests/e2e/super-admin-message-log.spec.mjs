import { test, expect } from '@playwright/test'

for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 414, height: 896 }, { width: 430, height: 932 }, { width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
  test(`empty Message log, filters and responsive layout at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const errors = [], requests = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
    await page.goto('/super-admin/preview/messaging')
    const log = page.locator('[data-super-admin-message-log]')
    await expect(log.getByRole('heading', { name: 'Message log', exact: true })).toBeVisible()
    const headings = log.getByRole('columnheader')
    await expect(headings).toHaveText(['Time', 'Facility', 'To', 'Message', 'Channel', 'Status'])
    const rows = log.locator('tbody tr'), filters = log.getByRole('group', { name: 'Message status filters' })
    await expect(rows).toHaveCount(1)
    await expect(filters.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(log.getByText('No messages available yet.', { exact: true })).toBeVisible()
    await expect(log.locator('time')).toHaveCount(0)
    await expect(log).not.toContainText(/Absolute Health|Lifeline|Mercy Cross|\+234|Email/)
    const nav = log.getByRole('navigation', { name: 'Message log pagination' })
    await expect(nav.getByRole('button')).toHaveCount(2)
    await expect(nav.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    await expect(nav.getByRole('button', { name: 'Next page' })).toBeDisabled()
    await expect(log.getByText('Page 1 of 1', { exact: true })).toBeVisible()
    await expect(log.getByText('7 / page', { exact: true })).toBeVisible()
    for (const status of ['Failed', 'Queued']) {
      await filters.getByRole('button', { name: status, exact: true }).click()
      await expect(log.getByText('No matching messages found.', { exact: true })).toBeVisible()
      await expect(log.getByText('Page 1 of 1', { exact: true })).toBeVisible()
      await expect(page.getByRole('article', { name: 'Failed', exact: true }).locator('p').first()).toHaveText('—')
      await expect(page.getByRole('article', { name: 'Delivery rate' }).locator('p').first()).toHaveText('—')
    }
    await filters.getByRole('button', { name: 'All', exact: true }).click()
    await expect(log.getByText('No messages available yet.', { exact: true })).toBeVisible()
    await rows.first().locator('td').first().click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page).toHaveURL(/\/super-admin\/preview\/messaging$/)
    const panels = page.getByRole('region', { name: 'Usage', exact: true })
    const lb = await log.boundingBox(), pb = await panels.boundingBox()
    expect(lb.y).toBeGreaterThanOrEqual(pb.y + pb.height)
    const content = page.getByRole('region', { name: 'Messaging content' })
    if (viewport.width >= 1280) {
      expect(await content.evaluate(node => node.scrollHeight <= node.clientHeight)).toBe(true)
      const card = await log.locator('[data-message-log-card]').boundingBox()
      const footer = await log.locator('.subscriber-pagination').boundingBox()
      const head = await log.locator('thead').boundingBox()
      const body = await log.locator('tbody').boundingBox()
      expect(card.height).toBeGreaterThanOrEqual(244)
      expect(Math.abs(card.y + card.height - footer.y - footer.height - 1)).toBeLessThan(1)
      expect(Math.abs(head.y - card.y - 1)).toBeLessThan(1)
      const text = await log.getByText('No messages available yet.', { exact: true }).evaluate(node => {
        const range = document.createRange(); range.selectNodeContents(node)
        const rect = range.getBoundingClientRect(); return { y: rect.y, height: rect.height }
      })
      expect(Math.abs(text.y + text.height / 2 - body.y - body.height / 2)).toBeLessThan(2)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (viewport.width < 1024) expect(await log.getByRole('region', { name: 'Message log table' }).evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true)
    await expect(log.getByRole('searchbox')).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath(`message-log-${viewport.width}.png`), fullPage: true })
    expect(errors).toEqual([]); expect(requests).toEqual([])
  })
}

async function mountLog(page, mode) {
  await page.goto('/super-admin/preview/messaging')
  await page.evaluate(async mode => {
    const [{ default: React }, { default: ReactDOM }, { default: MessageLogTable }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/src/super-admin/MessageLogTable.jsx'),
    ])
    const node = document.createElement('div'); node.dataset.testid = 'isolated-log'; document.body.append(node)
    const records = mode === 'future' ? Array.from({ length: 25 }, (_, i) => ({ id: `isolated-${i}`, time: '2026-10-27T09:20:00Z', facilityName: `Isolated test facility ${i}`, recipient: '+234802****447', kind: 'staff_invite', channel: 'sms', status: i % 2 ? 'queued' : 'failed' })) : mode === 'empty' ? [] : undefined
    ReactDOM.createRoot(node).render(React.createElement(MessageLogTable, { records }))
  }, mode)
  return page.getByTestId('isolated-log')
}

test('isolated future records paginate by seven, filter first and reset to page one', async ({ page }) => {
  const fixture = await mountLog(page, 'future')
  const rows = fixture.locator('tbody tr'), nav = fixture.getByRole('navigation'), filters = fixture.getByRole('group')
  await expect(rows).toHaveCount(7)
  await expect(fixture.getByText('Page 1 of 4', { exact: true })).toBeVisible()
  await nav.getByRole('button', { name: 'Next page' }).click()
  await expect(rows.first()).toContainText('Isolated test facility 7')
  await expect(fixture.getByText('Page 2 of 4', { exact: true })).toBeVisible()
  await filters.getByRole('button', { name: 'Failed', exact: true }).click()
  await expect(fixture.getByText('Page 1 of 2', { exact: true })).toBeVisible()
  await expect(rows).toHaveCount(7)
  await nav.getByRole('button', { name: 'Next page' }).click()
  await expect(rows).toHaveCount(6)
  await expect(nav.getByRole('button', { name: 'Next page' })).toBeDisabled()
  await nav.getByRole('button', { name: 'Previous page' }).click()
  await expect(rows).toHaveCount(7)
  await filters.getByRole('button', { name: 'Queued', exact: true }).click()
  await nav.getByRole('button', { name: 'Next page' }).click()
  await expect(rows).toHaveCount(5)
  await expect(rows.first().locator('td').last()).toHaveText('Queued')
  await filters.getByRole('button', { name: 'All', exact: true }).click()
  await expect(fixture.getByText('Page 1 of 4', { exact: true })).toBeVisible()
  for (let i = 0; i < 3; i++) await nav.getByRole('button', { name: 'Next page' }).click()
  await expect(rows).toHaveCount(4)
  await expect(fixture.getByText('Page 4 of 4', { exact: true })).toBeVisible()
})

for (const mode of ['empty', 'unconnected']) test(`isolated ${mode} log has honest empty state and disabled pagination`, async ({ page }) => {
  const fixture = await mountLog(page, mode)
  await expect(fixture.getByText('No messages available yet.', { exact: true })).toBeVisible()
  await fixture.getByRole('button', { name: 'Failed', exact: true }).click()
  await expect(fixture.getByRole('navigation').getByRole('button', { name: 'Next page' })).toBeDisabled()
  await expect(fixture.getByRole('navigation').getByRole('button', { name: 'Previous page' })).toBeDisabled()
  await expect(fixture.getByText('Page 1 of 1', { exact: true })).toBeVisible()
})


test('compact desktop uses one natural scroll area on short screens without cropping rows', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 })
  await page.goto('/super-admin/preview/messaging')
  const content = page.getByRole('region', { name: 'Messaging content' })
  const log = page.locator('[data-super-admin-message-log]')
  await expect(log.getByText('No messages available yet.', { exact: true })).toBeVisible()
  expect(await content.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true)
  await log.getByRole('navigation', { name: 'Message log pagination' }).scrollIntoViewIfNeeded()
  await expect(log.locator('tbody tr').last()).toBeVisible()
  await expect(log.getByText('Page 1 of 1', { exact: true })).toBeVisible()
  await expect(log.locator('tbody td').first()).toHaveCSS('font-size', '14px')
  const scrolling = await content.evaluate(root => [root, ...root.querySelectorAll('*')].filter(node => {
    const style = getComputedStyle(node)
    return node.scrollHeight > node.clientHeight + 1 && ['auto', 'scroll'].includes(style.overflowY)
  }).map(node => node.getAttribute('aria-label')))
  expect(scrolling).toEqual(['Messaging content'])
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
})

test('supplied messaging states retain real metrics, facility allowances and bottom pagination', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  const errors = [], requests = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
  await page.goto('/super-admin/preview/messaging')
  await page.evaluate(async () => {
    const [{ default: React }, { default: ReactDOM }, { default: Harness }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/tests/fixtures/MessagingHarness.jsx'),
    ])
    document.getElementById('root').hidden = true
    const node = document.createElement('div'); node.dataset.testid = 'messaging-state'; document.body.append(node)
    const root = ReactDOM.createRoot(node)
    // Isolated inputs only; not application preview data.
    const data = {
      months: [
        { month: '2026-10', sms: { delivered: 4, failed: 1, queued: 3 }, whatsapp: { delivered: 4, failed: 1, queued: 2 } },
        { month: '2026-09', sms: { delivered: 2, failed: 1, queued: 0 }, whatsapp: { delivered: 2, failed: 0, queued: 0 } },
      ],
      credit: { remainingNaira: 0 },
      categories: [{ name: 'Staff invites', count: 0 }, { name: 'Verification codes', count: 2 }],
      usage: [{ name: 'Test facility A', used: 1, allowance: 10 }, { name: 'Test facility B', used: 1, allowance: 20 }, { name: 'Test facility C', used: 2, allowance: null }],
      messageLog: Array.from({ length: 8 }, (_, index) => ({ id: `test-${index}`, time: '2026-10-27T09:20:00Z', facilityName: `Test facility ${index}`, recipient: '+234800****001', kind: 'staff_invite', channel: index % 2 ? 'sms' : 'whatsapp', status: ['delivered', 'failed', 'queued'][index % 3] })),
    }
    window.renderMessagingState = status => root.render(React.createElement(Harness, { state: { status, data } }))
    window.renderMessagingState('empty')
  })
  const host = page.getByTestId('messaging-state'), log = host.locator('[data-super-admin-message-log]'), summary = host.getByRole('region', { name: 'Messaging summary' })
  const footer = log.locator('.subscriber-pagination')
  await expect(log.getByText('No messages available yet.', { exact: true })).toBeVisible()
  const emptyFooter = await footer.boundingBox()
  for (const [status, message] of [['loading', 'Loading messages...'], ['error', 'Unable to load messages.']]) {
    await page.evaluate(status => window.renderMessagingState(status), status)
    await expect(log.getByText(message, { exact: true })).toBeVisible()
    for (const card of await summary.getByRole('article').all()) await expect(card.locator('p').first()).toHaveText('—')
    await expect(host.getByRole('region', { name: 'Messages', exact: true }).getByText('—', { exact: true })).toHaveCount(3)
    await expect(host.getByRole('region', { name: 'Usage', exact: true }).getByRole('listitem')).toHaveCount(0)
    await expect(log.locator('time')).toHaveCount(0)
  }
  await page.evaluate(() => window.renderMessagingState('ready'))
  await expect(summary.getByRole('article', { name: 'Sent in October' }).locator('p').first()).toHaveText('10')
  await expect(summary.getByText('+100% vs September', { exact: true })).toBeVisible()
  await expect(summary.getByRole('article', { name: 'Delivery rate' }).locator('p').first()).toHaveText('80.0%')
  await expect(summary.getByRole('article', { name: 'Failed', exact: true }).locator('p').first()).toHaveText('2')
  await expect(summary.getByRole('article', { name: 'Termii credit' }).locator('p').first()).toHaveText('₦0')
  await expect(summary.getByRole('article', { name: 'Termii credit' }).locator('p').last()).toHaveText('—')
  const messages = host.getByRole('region', { name: 'Messages', exact: true })
  await expect(messages.getByRole('listitem').first().getByText('0', { exact: true })).toBeVisible()
  await expect(messages.getByRole('listitem').last().getByText('—', { exact: true })).toBeVisible()
  const usage = host.getByRole('region', { name: 'Usage', exact: true })
  await expect(usage.getByRole('progressbar', { name: 'Test facility A usage' })).toHaveAttribute('aria-valuenow', '10')
  await expect(usage.getByRole('progressbar', { name: 'Test facility B usage' })).toHaveAttribute('aria-valuenow', '5')
  await expect(usage.getByText('2 · Unlimited', { exact: true })).toBeVisible()
  await expect(usage.getByRole('progressbar')).toHaveCount(2)
  await expect(log.locator('tbody tr')).toHaveCount(7)
  for (const [status, color] of [['Delivered', 'rgb(47, 125, 89)'], ['Failed', 'rgb(184, 63, 92)'], ['Queued', 'rgb(71, 90, 162)']]) {
    await expect(log.locator('tbody').getByText(status, { exact: true }).first()).toHaveCSS('color', color)
  }
  for (const row of await log.locator('tbody tr').all()) expect(['SMS', 'WhatsApp']).toContain(await row.locator('td').nth(4).innerText())
  const populatedFooter = await footer.boundingBox()
  expect(Math.abs(populatedFooter.y - emptyFooter.y)).toBeLessThan(1)
  await log.getByRole('button', { name: 'Next page' }).click()
  await expect(log.getByText('Page 2 of 2', { exact: true })).toBeVisible()
  await expect(log.locator('tbody tr')).toHaveCount(1)
  await log.getByRole('group').getByRole('button', { name: 'Failed', exact: true }).click()
  await expect(log.getByText('Page 1 of 1', { exact: true })).toBeVisible()
  await expect(log.locator('tbody tr')).toHaveCount(3)
  await expect(summary.getByRole('article', { name: 'Sent in October' }).locator('p').first()).toHaveText('10')
  expect(errors).toEqual([])
  expect(requests).toEqual([])
})
