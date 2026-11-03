import { test, expect } from '@playwright/test'

for (const width of [1440, 768, 390, 320]) {
  test(`designer landing page navigation and interactions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto('/create-account')
    const bodyFontBefore = await page.locator('body').evaluate(element => getComputedStyle(element).fontFamily)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Medication records, from prescription to patient')
    await expect(page.locator('.hero h1')).toHaveCSS('opacity', '1')
    await expect(page.locator('.hero h1')).toHaveCSS('text-align', 'center')
    await expect(page.locator('.hero')).toHaveCSS('padding-top', width <= 640 ? '40px' : '72px')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await expect(page.locator('.feed .note')).toHaveCount(3)
    const heroImage = page.getByRole('img', { name: 'A doctor and patient reviewing a medication record on MedTrail together' })
    await expect(heroImage).toBeVisible()
    await expect.poll(() => heroImage.evaluate(image => image.complete && image.naturalWidth === 2000 && image.naturalHeight === 1125)).toBe(true)
    await expect(page.locator('#about .stage')).toHaveCount(1)
    await expect(page.locator('.hero .stage')).toHaveCount(0)
    const monitor = await page.locator('.mon').boundingBox()
    const dashboard = await page.locator('.dash').boundingBox()
    expect(Math.abs(monitor.width - dashboard.width)).toBeLessThan(1)
    expect(Math.abs(monitor.height - dashboard.height)).toBeLessThan(1)
    if (width <= 640) {
      expect((await page.locator('.nav-in > .logo').boundingBox()).x).toBeGreaterThanOrEqual(16)
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeInViewport()
      // The animated cards stay below the title as text wraps on small screens.
      const title = await page.locator('.panel.deep h3').boundingBox()
      const feed = await page.locator('.feed').boundingBox()
      expect(feed.y).toBeGreaterThan(title.y + title.height)
    }

    // Verify that navigation is usable on both desktop and the mobile menu.
    for (const [name, section] of [['How it works', 'how'], ['Features', 'features'], ['Pricing', 'pricing'], ['FAQ', 'faq']]) {
      if (width <= 1020) await page.getByRole('button', { name: 'Open navigation' }).click()
      await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`#${section}$`))
      // Auto-advancing workflow descriptions can slightly change the preceding section height.
      await expect.poll(async () => {
        const header = await page.locator('header.nav').boundingBox()
        return Math.abs((await page.locator(`#${section}`).boundingBox()).y - header.y - header.height - 12)
      }).toBeLessThan(48)
      await expect(page.locator('header.nav')).toHaveClass(/scrolled/)
      expect(Math.abs((await page.locator('header.nav').boundingBox()).y)).toBeLessThan(1)
    }

    // Pricing changes are reversible and never start a checkout.
    await page.getByRole('button', { name: /Annual/ }).click()
    await expect(page.locator('.price').first()).toContainText('₦25,000')
    await expect(page.locator('.billed').first()).toHaveText('Billed ₦300,000 yearly')
    await page.getByRole('button', { name: 'Monthly', exact: true }).click()
    await expect(page.locator('.price').first()).toContainText('₦30,000')
    await expect(page.locator('.billed').first()).toBeEmpty()

    const tabs = page.getByRole('tab')
    await tabs.nth(1).click()
    await expect(page.getByRole('tabpanel')).toContainText('Verification queue')
    await page.keyboard.press('ArrowDown')
    await expect(tabs.nth(2)).toBeFocused()
    await expect(page.getByRole('tabpanel')).toContainText('Request clarification')
    await page.keyboard.press('End')
    await expect(page.getByRole('tabpanel')).toContainText('ready to collect')
    await page.keyboard.press('Home')
    await expect(page.getByRole('tabpanel')).toContainText('Add medication')

    await page.getByText('Do we have to replace our current hospital system?', { exact: true }).click()
    await expect(page.locator('details').first()).toHaveAttribute('open', '')
    await expect(page.getByRole('link', { name: 'Patient access', exact: true })).toHaveAttribute('href', '/patient/login')
    await expect(page.getByRole('link', { name: 'Book a demo', exact: true })).toHaveAttribute('href', 'mailto:hello@medtrail.ng')
    expect(await page.locator('a[href*="localhost"], a[href="#"]').count()).toBe(0)
    await page.screenshot({ path: `/private/tmp/medtrail-updated-landing-${width}.png`, fullPage: true })

    // React Router navigation preserves the document and the page's CSS stays scoped.
    await page.evaluate(() => { window.landingNavigationMarker = true })
    await page.getByRole('link', { name: 'Start your free trial', exact: true }).click()
    await expect(page).toHaveURL('/create-account')
    expect(await page.evaluate(() => window.landingNavigationMarker)).toBe(true)
    await expect(page.locator('.medtrail-landing')).toHaveCount(0)
    expect(await page.locator('body').evaluate(element => getComputedStyle(element).fontFamily)).toBe(bodyFontBefore)
    await page.goto('/')
    if (width < 640) await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('link', { name: 'Sign in', exact: true }).click()
    await expect(page).toHaveURL('/select-role')
    await expect(page.getByRole('heading', { name: 'Welcome to Medtrail' })).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('landing page respects reduced motion and direct section links', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#how')
  await expect(page.locator('#about .typing')).toContainText('Amoxicillin')
  await expect(page.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.prog').first()).toHaveCSS('animation-name', 'none')
  await expect.poll(async () => {
    const header = await page.locator('header.nav').boundingBox()
    return Math.abs((await page.locator('#how').boundingBox()).y - header.y - header.height - 12)
  }).toBeLessThan(5)
  await page.getByRole('link', { name: 'MedTrail home', exact: true }).first().click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect(page.locator('header.nav')).not.toHaveClass(/scrolled/)
  await page.getByRole('tab').last().click()
  await expect(page.getByRole('tabpanel')).toContainText('ready to collect')
})

// Compare actual page styles with and without the landing stylesheet, rather than
// assuming the application's global font or other design choices never change.
test('landing stylesheet preserves account and role-selection page styling', async ({ page }) => {
  for (const path of ['/create-account', '/select-role']) {
    await page.goto(path)
    await page.evaluate(() => document.fonts.ready)
    const comparison = await page.evaluate(() => {
      // These browser tests run through Vite, which injects each source stylesheet separately.
      const sheet = [...document.styleSheets].find(sheet =>
        sheet.ownerNode?.getAttribute('data-vite-dev-id')?.endsWith('/pages/landing-page-v2.css'))
      if (!sheet) throw new Error('Landing stylesheet must be loaded for the isolation check')
      const elements = [...document.querySelectorAll('body, main, section, h1, h2, h3, h4, p, label, input, button')]
      const properties = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor', 'padding', 'margin', 'borderRadius', 'boxSizing']
      const snapshot = () => elements.map(element => {
        const style = getComputedStyle(element)
        return Object.fromEntries(properties.map(property => [property, style[property]]))
      })
      try {
        sheet.disabled = true
        const withoutLanding = snapshot()
        sheet.disabled = false
        return { withoutLanding, withLanding: snapshot() }
      } finally {
        sheet.disabled = false
      }
    })
    expect(comparison.withLanding).toEqual(comparison.withoutLanding)
  }
})
