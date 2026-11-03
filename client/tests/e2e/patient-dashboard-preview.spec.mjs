import { test, expect } from '@playwright/test'

for (const viewport of [{ width: 1440, height: 929 }, { width: 320, height: 568 }]) {
  test(`preview logout modal opens and all dismissals preserve sessions at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const requests = []
    await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
    await page.goto('/patient/preview/dashboard')
    // Seed isolated browser fixtures, never the user's browser storage.
    await page.evaluate(() => {
      for (const role of ['Patient', 'Admin', 'Doctor', 'Pharmacist']) {
        const payload = btoa(JSON.stringify({ sub: `${role}-fixture`, role: role.toLowerCase(), exp: Math.floor(Date.now() / 1000) + 600 }))
        sessionStorage.setItem(`medtrail${role}Session`, JSON.stringify({ token: `test.${payload}.test` }))
      }
      localStorage.setItem('preview-logout-fixture', 'preserve')
    })
    const before = await page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage } }))
    const logout = page.getByRole('button', { name: 'Log out', exact: true })
    const dialog = page.getByRole('dialog', { name: 'LOG OUT', exact: true })
    for (const action of ['Cancel', 'Close log out confirmation', 'Escape', 'Yes, Log out']) {
      await logout.click()
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText('Are you sure you want to log out of your account', { exact: true })).toBeVisible()
      await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
      const bounds = await dialog.boundingBox()
      expect(bounds.x).toBeGreaterThanOrEqual(0)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width)
      await expect(dialog.getByRole('button', { name: 'Yes, Log out', exact: true })).toBeInViewport()
      if (action === 'Cancel') await dialog.screenshot({ path: testInfo.outputPath('logout-modal.png') })
      if (action === 'Escape') await page.keyboard.press('Escape')
      else await dialog.getByRole('button', { name: action, exact: true }).click()
      await expect(dialog).toHaveCount(0)
      await expect(logout).toBeFocused()
      await expect(page).toHaveURL(/\/patient\/preview\/dashboard$/)
      expect(await page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage } }))).toEqual(before)
    }
    expect(requests).toEqual([])
  })
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 667 }]) {
  test(`separate 25-record pagination preview is isolated and functional at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const requests = []
    await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
    await page.goto('/patient/login')
    const stored = await page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage } }))
    await page.goto('/patient/preview/diagnoses-pagination')
    await expect(page.getByRole('complementary', { name: 'Development preview' })).toContainText('25 fictitious diagnoses')
    const nav = page.getByRole('navigation', { name: 'Diagnoses pagination' })
    const desktop = viewport.width >= 1024
    const size = desktop ? 10 : 5
    await expect(page.locator('tbody tr')).toHaveCount(size)
    await expect(page.getByText(`Showing 1–${size} of 25`, { exact: true })).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled()
    const position = await page.evaluate(() => ({
      tableBottom: document.querySelector('table').getBoundingClientRect().bottom,
      footerTop: document.querySelector('nav[aria-label="Diagnoses pagination"]').parentElement.getBoundingClientRect().top,
    }))
    expect(Math.abs(position.footerTop - position.tableBottom)).toBeLessThanOrEqual(1)
    await nav.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.locator('tbody tr').first()).toContainText(desktop ? 'Test diagnosis 11' : 'Test diagnosis 06')
    if (desktop) await nav.getByRole('button', { name: 'Page 3', exact: true }).click()
    else {
      await expect(nav.getByRole('button')).toHaveCount(2)
      for (let i = 0; i < 3; i++) await nav.getByRole('button', { name: 'Next', exact: true }).click()
    }
    await expect(page.getByText('Showing 21–25 of 25', { exact: true })).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
    await nav.getByRole('button', { name: 'Previous', exact: true }).click()
    await expect(page.getByText(desktop ? 'Showing 11–20 of 25' : 'Showing 16–20 of 25', { exact: true })).toBeVisible()
    const search = page.getByRole('searchbox', { name: 'Search diagnoses' })
    await search.fill('Alpha')
    await expect(page.getByText(`Showing 1–${size} of 12`, { exact: true })).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled()
    await nav.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.locator('tbody tr')).toHaveCount(desktop ? 2 : 5)
    await expect(page.locator('tbody')).not.toContainText('Beta')
    await search.fill('Test diagnosis 25')
    await expect(page.locator('tbody tr')).toHaveCount(1)
    await expect(nav).toHaveCount(0)
    await search.fill('no results')
    await expect(page.getByText('No diagnoses match your search.')).toBeVisible()
    await expect(nav).toHaveCount(0)
    await search.fill('')
    await expect(page.getByText(`Showing 1–${size} of 25`, { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('region', { name: 'Diagnoses', exact: true }).screenshot({ path: testInfo.outputPath('pagination-preview.png') })
    expect(requests).toEqual([])
    expect(await page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage } }))).toEqual(stored)
    await page.goto('/patient/preview/dashboard')
    await expect(page.getByText('No diagnoses recorded yet', { exact: true })).toBeVisible()
    await expect(page.getByText(/Test diagnosis/)).toHaveCount(0)
    await expect(nav).toHaveCount(0)
    await page.goto('/patient/dashboard')
    await expect(page).toHaveURL(/\/patient\/login$/)
  })
}

test('local Patient dashboard preview works without login, makes no API calls and preserves sessions', async ({ page }) => {
  const requests = []
  await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
  await page.goto('/patient/login')
  const before = await page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage } }))
  await page.goto('/patient/preview/dashboard')
  await expect(page.getByRole('heading', { name: 'Welcome, Sample Patient (mock)' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Development preview' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Prescription summary' }).locator('article p')).toHaveText(['0', '0', '0', '0'])
  await expect(page.getByRole('region', { name: 'Active prescriptions', exact: true }).locator('article')).toHaveCount(0)
  await expect(page.getByText('No active prescriptions yet.', { exact: true })).toBeVisible()
  await expect(page.locator('tbody')).toContainText('No diagnoses recorded yet')
  await expect(page.getByRole('navigation', { name: 'Diagnoses pagination' })).toHaveCount(0)
  await expect(page.getByText(/Example medication|Example condition/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Log out' })).toBeEnabled()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Welcome, Sample Patient (mock)' })).toBeVisible()
  expect(requests).toEqual([])
  expect(await page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage } }))).toEqual(before)
  await page.goto('/patient/dashboard')
  await expect(page).toHaveURL(/\/patient\/login$/)
})

for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1440, height: 929 }, { width: 1440, height: 900 }, { width: 375, height: 667 }, { width: 1280, height: 480 }]) {
  test(`empty preview fits desktop or scrolls safely at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.route('**/api/**', route => route.abort())
    await page.goto('/patient/preview/dashboard')
    await expect(page.getByText('No diagnoses recorded yet', { exact: true })).toBeVisible()
    const bounds = await page.evaluate(() => {
      const heading = document.getElementById('patient-diagnoses').getBoundingClientRect()
      const search = document.querySelector('input[type="search"]').getBoundingClientRect()
      const table = document.querySelector('table').getBoundingClientRect()
      return { height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth, heading: { left: heading.left, bottom: heading.bottom }, search: { left: search.left, top: search.top, bottom: search.bottom }, tableTop: table.top }
    })
    expect(bounds.width).toBeLessThanOrEqual(viewport.width)
    expect(bounds.search.left).toBe(bounds.heading.left)
    expect(bounds.search.top).toBeGreaterThan(bounds.heading.bottom)
    expect(bounds.search.bottom).toBeLessThan(bounds.tableTop)
    if (viewport.width >= 1024) {
      const frame = await page.evaluate(() => {
        const content = document.querySelector('main > div')
        const dashboard = content.lastElementChild
        const sections = [...dashboard.children].map(element => element.getBoundingClientRect())
        const style = getComputedStyle(content)
        return {
          width: content.getBoundingClientRect().width,
          padding: [style.paddingLeft, style.paddingRight, style.paddingBottom],
          gaps: sections.slice(1).map((section, index) => section.top - sections[index].bottom),
          left: sections.map(section => section.left),
        }
      })
      expect(frame.width).toBe(viewport.width)
      expect(frame.padding).toEqual(['24px', '24px', '22px'])
      expect(frame.gaps).toEqual([40, 40, 40])
      expect(frame.left).toEqual([24, 24, 24, 24])
    }
    if (viewport.width >= 1024 && viewport.height >= 720) expect(bounds.height).toBeLessThanOrEqual(viewport.height)
    else expect(bounds.height).toBeGreaterThan(viewport.height)
    await page.getByText('No diagnoses recorded yet', { exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByText('No diagnoses recorded yet', { exact: true })).toBeInViewport()
    await page.screenshot({ path: testInfo.outputPath('empty-dashboard.png'), fullPage: true })
  })
}
