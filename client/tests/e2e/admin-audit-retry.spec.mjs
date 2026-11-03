import { test, expect } from '@playwright/test'

// Isolated API fixtures only; these tests never read or write a live audit log.
for (const width of [1440, 390]) {
  test(`Admin audit loading, retry and table controls remain functional at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const token = `test.${Buffer.from(JSON.stringify({ sub: 'audit-fixture', role: 'admin', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`
    await page.addInitScript(token => sessionStorage.setItem('medtrailAdminSession', JSON.stringify({ token, role: 'admin' })), token)
    const records = Array.from({ length: 15 }, (_, i) => ({
      id: `audit-${i + 1}`, who: `Operator ${i + 1}`, patient: 'Test-only patient',
      event: i < 2 ? 'Unique audit event' : 'Routine audit event',
      actionType: i < 3 ? 'dispensed' : 'prescribed',
      when: `Record ${i + 1}`, createdAt: `2026-01-${String(i + 1).padStart(2, '0')}T12:00:00Z`,
    }))
    let initialRelease
    const initialGate = new Promise(resolve => { initialRelease = resolve })
    let retryRelease
    const retryGate = new Promise(resolve => { retryRelease = resolve })
    let retry = false
    let auditRequests = 0
    await page.route('**/api/**', async route => {
      expect(route.request().method()).toBe('GET')
      const path = new URL(route.request().url()).pathname
      if (path === '/api/auth/profile') return route.fulfill({ json: { id: 'audit-fixture', role: 'admin', name: 'Audit fixture', isEmailVerified: true } })
      if (path !== '/api/admin/audit-log') return route.abort()
      auditRequests += 1
      if (!retry) {
        await initialGate
        return route.fulfill({ status: 500, json: { message: 'Test-only audit failure' } })
      }
      await retryGate
      return route.fulfill({ json: records })
    })
    await page.goto('/admin/audit-log')
    await expect(page.getByText('Loading audit activities...', { exact: true })).toBeVisible()
    initialRelease()
    await expect(page.getByText('Test-only audit failure', { exact: true })).toBeVisible()
    retry = true
    const previousRequests = auditRequests
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await expect(page.getByText('Loading audit activities...', { exact: true })).toBeVisible()
    await expect(page.getByText('Test-only audit failure', { exact: true })).toHaveCount(0)
    await expect.poll(() => auditRequests).toBeGreaterThan(previousRequests)
    retryRelease()
    const rows = page.locator('tbody tr')
    await expect(rows).toHaveCount(7)
    await expect(rows.first()).toContainText('Operator 15')
    await page.getByRole('button', { name: 'Next page', exact: true }).click()
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible()
    await expect(rows.first()).toContainText('Operator 8')
    await page.getByLabel('Sort audit log', { exact: true }).selectOption('Oldest')
    await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible()
    await expect(rows.first().locator('td').nth(1)).toHaveText('Operator 1')
    await page.getByRole('searchbox', { name: 'Search audit log' }).fill('Unique audit')
    await expect(rows).toHaveCount(2)
    await expect(page.getByText('Page 1 of 1', { exact: true })).toBeVisible()
    await page.getByRole('searchbox', { name: 'Search audit log' }).fill('')
    await page.getByLabel('Filter audit log by activity', { exact: true }).selectOption('Dispensed')
    await expect(rows).toHaveCount(3)
    await page.getByRole('searchbox', { name: 'Search audit log' }).fill('No matching audit')
    await expect(page.getByText('No activities', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
  })
}
