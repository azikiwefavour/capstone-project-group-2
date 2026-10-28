import { test, expect } from '@playwright/test'

for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 414, height: 896 }, { width: 430, height: 932 }, { width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
  test(`empty Audit log sorting, bottom pagination and layout at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const errors = [], requests = [], downloads = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    page.on('download', download => downloads.push(download.suggestedFilename()))
    await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
    await page.goto('/super-admin/preview/overview')
    const nav = page.getByRole('navigation', { name: 'Super Admin navigation' })
    await nav.getByRole('link', { name: 'Audit log', exact: true }).click()
    await expect(page).toHaveURL(/\/super-admin\/preview\/audit-log$/)
    await expect(nav.getByRole('link', { name: 'Audit log', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { name: 'Audit log', exact: true })).toBeVisible()
    await expect(page.getByText('Platform events: facility approvals, billing and plan changes.', { exact: true })).toBeVisible()
    await expect(page.getByRole('status')).toContainText('no active login, audit data or event tracking')
    const exportButton = page.getByRole('button', { name: 'Export data', exact: true })
    await expect(exportButton).toBeVisible(); await expect(exportButton).toBeDisabled()
    await exportButton.evaluate(button => button.click())
    const table = page.locator('[data-super-admin-audit-log]'), rows = table.locator('tbody tr')
    await expect(table.getByRole('columnheader')).toHaveText(['When', 'Who', 'Action', 'Facility'])
    await expect(rows).toHaveCount(1)
    await expect(table.getByText('No audit log records available yet.', { exact: true })).toBeVisible()
    await expect(table.getByRole('columnheader').first()).toHaveAttribute('aria-sort', 'descending')
    await expect(rows.locator('time')).toHaveCount(0)
    await expect(table).not.toContainText(/Adekemi Johnson|Absolute Health|Lifeline|Mercy Cross|Subscription plan changed|Card charge failed/)
    for (const [label, index] of [['When', 0], ['Who', 1], ['Action', 2], ['Facility', 3]]) {
      const control = table.getByRole('button', { name: `Sort by ${label}`, exact: true })
      for (let toggle = 0; toggle < 2; toggle++) {
        await control.click()
        const heading = table.getByRole('columnheader').nth(index)
        const direction = toggle === 0 ? 'ascending' : 'descending'
        await expect(heading).toHaveAttribute('aria-sort', direction)
        await expect(control.locator('svg')).toHaveAttribute('data-sort-direction', toggle === 0 ? 'asc' : 'desc')
        await expect(table.getByText('No audit log records available yet.', { exact: true })).toBeVisible()
      }
    }
    const pagination = table.getByRole('navigation', { name: 'Audit log pagination' })
    await expect(pagination.getByRole('button')).toHaveCount(2)
    await expect(pagination.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    await expect(pagination.getByRole('button', { name: 'Next page' })).toBeDisabled()
    await expect(table.getByText('Page 1 of 1', { exact: true })).toBeVisible()
    await expect(table.getByText('7 / page', { exact: true })).toBeVisible()
    await rows.first().locator('td').first().click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page).toHaveURL(/\/super-admin\/preview\/audit-log$/)
    const content = page.getByRole('region', { name: 'Audit log content', exact: true })
    await expect(content.locator('input, select')).toHaveCount(0)
    if (viewport.width >= 1024) {
      expect(await content.evaluate(n => n.scrollHeight <= n.clientHeight)).toBe(true)
      const metrics = await content.evaluate(root => {
        const rect = node => node.getBoundingClientRect()
        const card = root.querySelector('[data-super-admin-audit-log]'), footer = card.querySelector('.subscriber-pagination'), body = card.querySelector('tbody'), head = card.querySelector('thead')
        const range = document.createRange(); range.selectNodeContents(body.querySelector('td'))
        return { footerGap: rect(card).bottom - rect(footer).bottom, bottomGap: rect(root).bottom - rect(card).bottom, padding: parseFloat(getComputedStyle(root).paddingBottom), headerGap: rect(head).top - rect(card).top, bodyHeight: rect(body).height, messageCenter: range.getBoundingClientRect().top + range.getBoundingClientRect().height / 2, bodyCenter: rect(body).top + rect(body).height / 2 }
      })
      expect(Math.abs(metrics.footerGap - 1)).toBeLessThan(1)
      expect(Math.abs(metrics.bottomGap - metrics.padding)).toBeLessThan(1)
      expect(Math.abs(metrics.headerGap - 1)).toBeLessThan(1)
      expect(metrics.bodyHeight).toBeGreaterThan(350)
      expect(Math.abs(metrics.messageCenter - metrics.bodyCenter)).toBeLessThan(2)
      await expect(pagination).toBeInViewport()
    }
    else expect(await table.getByRole('region', { name: 'Audit log table' }).evaluate(n => n.scrollWidth > n.clientWidth)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`audit-log-${viewport.width}.png`), fullPage: true })
    await nav.getByRole('link', { name: 'System Health', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Platform', exact: true })).toBeVisible()
    await nav.getByRole('link', { name: 'Overview', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Platform overview', exact: true })).toBeVisible()
    expect(errors).toEqual([]); expect(requests).toEqual([]); expect(downloads).toEqual([])
  })
}

async function mountAudit(page, mode) {
  await page.goto('/super-admin/preview/audit-log')
  await page.evaluate(async mode => {
    const [{ default: React }, { default: ReactDOM }, { default: Harness }] = await Promise.all([import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/tests/fixtures/AuditLogHarness.jsx')])
    document.getElementById('root').hidden = true
    const node = document.createElement('div'); node.dataset.testid = 'isolated-audit'; document.body.append(node)
    // Isolated sorting/pagination inputs only; never imported by application routes.
    const records = Array.from({ length: 25 }, (_, i) => ({ id: `isolated-${i}`, timestamp: new Date(Date.UTC(2027, 1, 1, 0, i)).toISOString(), actorName: i % 2 ? `Test actor ${i}` : 'System', actorRole: i % 2 ? 'Isolated test' : 'Automated action', action: String(i).padStart(2, '0'), facilityName: i % 4 ? `Test facility ${i}` : null }))
    const root = ReactDOM.createRoot(node)
    window.renderAuditState = (status, nextRecords = records) => root.render(React.createElement(Harness, { state: { status, records: nextRecords } }))
    window.renderAuditState(mode === 'unavailable' ? 'unavailable' : 'ready', mode === 'future' ? records : mode === 'malformed' ? null : [])
  }, mode)
  return page.getByTestId('isolated-audit').locator('[data-super-admin-audit-log]')
}

test('isolated future records paginate after sorting and every sort resets to page one', async ({ page }) => {
  const table = await mountAudit(page, 'future'), rows = table.locator('tbody tr'), nav = table.getByRole('navigation')
  await expect(rows).toHaveCount(7)
  await expect(table.getByText('Page 1 of 4', { exact: true })).toBeVisible()
  await expect(rows.first().locator('td').nth(2)).toHaveText('24')
  await nav.getByRole('button', { name: 'Next page' }).click()
  await expect(rows.first().locator('td').nth(2)).toHaveText('17')
  await table.getByRole('button', { name: 'Sort by Action' }).click()
  await expect(table.getByText('Page 1 of 4', { exact: true })).toBeVisible()
  await expect(rows.first().locator('td').nth(2)).toHaveText('00')
  await nav.getByRole('button', { name: 'Next page' }).click()
  await expect(rows.first().locator('td').nth(2)).toHaveText('07')
  await table.getByRole('button', { name: 'Sort by Action' }).click()
  await expect(table.getByText('Page 1 of 4', { exact: true })).toBeVisible()
  await expect(rows.first().locator('td').nth(2)).toHaveText('24')
  for (let i = 0; i < 3; i++) await nav.getByRole('button', { name: 'Next page' }).click()
  await expect(rows).toHaveCount(4)
  await expect(nav.getByRole('button', { name: 'Next page' })).toBeDisabled()
  await nav.getByRole('button', { name: 'Previous page' }).click()
  await expect(rows).toHaveCount(7)
})

for (const mode of ['empty', 'unavailable']) test(`isolated ${mode} audit events remain honest and navigationally disabled`, async ({ page }) => {
  const table = await mountAudit(page, mode)
  await expect(table.getByText('No audit log records available yet.', { exact: true })).toBeVisible()
  await table.getByRole('button', { name: 'Sort by When' }).click()
  await expect(table.getByRole('navigation').getByRole('button', { name: 'Next page' })).toBeDisabled()
  await expect(table.getByRole('navigation').getByRole('button', { name: 'Previous page' })).toBeDisabled()
  await expect(table.getByText('Page 1 of 1', { exact: true })).toBeVisible()
})

test('supplied records retain all four sort orders and Who role descriptions', async ({ page }) => {
  const table = await mountAudit(page, 'future'), rows = table.locator('tbody tr')
  for (const row of await rows.all()) {
    const who = row.locator('td').nth(1), name = await who.locator('p').first().innerText()
    await expect(who.locator('p')).toHaveCount(2)
    await expect(who.locator('p').last()).toHaveText(name === 'System' ? 'Automated action' : 'Isolated test')
    await expect(row.locator('button, a, input')).toHaveCount(0)
  }
  for (const [label, index] of [['When', 0], ['Who', 1], ['Action', 2], ['Facility', 3]]) {
    const control = table.getByRole('button', { name: `Sort by ${label}`, exact: true })
    for (let toggle = 0; toggle < 2; toggle++) {
      await control.click()
      await expect(table.getByRole('columnheader').nth(index)).toHaveAttribute('aria-sort', toggle === 0 ? 'ascending' : 'descending')
      const values = label === 'When' ? await rows.locator('time').evaluateAll(nodes => nodes.map(node => Date.parse(node.dateTime))) : await rows.evaluateAll((nodes, index) => nodes.map(node => { const td = node.cells[index]; return index === 1 ? td.querySelector('p').textContent : td.textContent === '—' ? '' : td.textContent }), index)
      const expected = [...values].sort((a, b) => typeof a === 'number' ? a - b : a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true }))
      if (toggle === 1) expected.reverse()
      expect(values).toEqual(expected)
    }
  }
})

test('loading, error and missing data hide stale records without moving the footer', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  const errors = [], requests = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
  const table = await mountAudit(page, 'future')
  await expect(table.locator('tbody tr')).toHaveCount(7)
  const footer = table.locator('.subscriber-pagination'), original = await footer.boundingBox()
  for (const [status, message] of [['loading', 'Loading audit log records...'], ['error', 'Unable to load audit log records.'], ['unavailable', 'No audit log records available yet.'], ['empty', 'No audit log records available yet.']]) {
    await page.evaluate(status => window.renderAuditState(status), status)
    await expect(table.getByText(message, { exact: true })).toBeVisible()
    await expect(table.locator('time')).toHaveCount(0)
    await table.getByRole('button', { name: 'Sort by Action' }).click()
    for (const button of await table.getByRole('navigation').getByRole('button').all()) await expect(button).toBeDisabled()
    expect(Math.abs((await footer.boundingBox()).y - original.y)).toBeLessThan(1)
  }
  await page.evaluate(() => window.renderAuditState('ready', null))
  await expect(table.getByRole('alert')).toHaveText('Unable to load audit log records.')
  await page.evaluate(() => window.renderAuditState('ready', []))
  await expect(table.getByText('No audit log records available yet.', { exact: true })).toBeVisible()
  await expect(page.getByTestId('isolated-audit').getByRole('button', { name: 'Export data' })).toBeDisabled()
  expect(errors).toEqual([]); expect(requests).toEqual([])
})

test('short desktop keeps the table footer accessible with normal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 400 })
  await page.goto('/super-admin/preview/audit-log')
  const content = page.getByRole('region', { name: 'Audit log content' })
  expect(await content.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true)
  const pagination = page.getByRole('navigation', { name: 'Audit log pagination' })
  await pagination.scrollIntoViewIfNeeded()
  await expect(pagination).toBeInViewport()
  await expect(page.getByText('No audit log records available yet.', { exact: true })).toBeVisible()
})
