import { test, expect } from '@playwright/test'

const pages = [
  ['overview', 'Platform overview', 'Overview', 'No revenue data available.'],
  ['facilities', 'Facilities', 'Facilities', 'No facilities available yet.'],
  ['subscriptions', 'Subscriptions', 'Subscriptions', 'No subscriptions available yet.'],
  ['payments', 'Payments', 'Payments', 'No payment transactions available yet.'],
  ['messaging', 'Messaging', 'Messaging', 'No messages available yet.'],
  ['system-health', 'System Health', 'System Health', 'No monitoring data available yet.'],
  ['audit-log', 'Audit log', 'Audit log', 'No audit log records available yet.'],
]

for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  for (const [route, heading, link, emptyMessage] of pages) {
    test(`Super Admin ${route} loads directly at ${viewport.width}px without runtime errors`, async ({ page }) => {
      await page.setViewportSize(viewport)
      const errors = [], requests = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
      await page.route('**/api/**', request => { requests.push(request.request().url()); return request.abort() })
      await page.goto(`/super-admin/preview/${route}`)
      const title = page.getByRole('heading', { name: heading, exact: true })
      // Report startup failures explicitly instead of only timing out on a missing heading.
      await expect.poll(async () => errors.length ? errors.join('\n') : await title.isVisible() ? 'rendered' : 'waiting', { timeout: 5000 }).toBe('rendered')
      await expect(page.getByRole('complementary', { name: 'Super Admin sidebar' })).toBeVisible()
      const header = page.locator('[data-super-admin-layout] > section > header')
      await expect(header.getByText('Welcome', { exact: true })).toBeVisible()
      await expect(header.getByRole('button', { name: 'Open settings' })).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Super Admin navigation' }).getByRole('link', { name: link, exact: true })).toHaveAttribute('aria-current', 'page')
      if (emptyMessage) await expect(page.getByText(emptyMessage, { exact: true })).toBeVisible()
      expect(errors).toEqual([])
      expect(requests).toEqual([])
    })
  }

  test(`Super Admin sidebar navigates through all seven pages at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/super-admin/preview/overview')
    const nav = page.getByRole('navigation', { name: 'Super Admin navigation' })
    for (const [route, heading, link] of [...pages, pages[0]]) {
      await nav.getByRole('link', { name: link, exact: true }).click()
      await expect(page).toHaveURL(`/super-admin/preview/${route}`)
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    }
    expect(errors).toEqual([])
  })
}
