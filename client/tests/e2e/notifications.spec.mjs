import { test, expect } from '@playwright/test'

const roles = ['admin', 'doctor', 'pharmacist']

async function dashboardFixture(page, role, profileGate) {
  // Existing auth is exercised with test-only sessions and empty API fixtures.
  const token = `test.${Buffer.from(JSON.stringify({ sub: `${role}-fixture`, role, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`
  await page.addInitScript(({ role, token }) => {
    sessionStorage.setItem(`medtrail${role[0].toUpperCase()}${role.slice(1)}Session`, JSON.stringify({ token, ...(role === 'admin' ? { role } : {}) }))
  }, { role, token })
  const requests = []
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    requests.push(path)
    let data
    if (path === '/api/auth/profile' && profileGate) await profileGate
    if (path === '/api/auth/profile') data = { id: `${role}-fixture`, name: 'Notification test account', role, isEmailVerified: true, invitationStatus: 'accepted', hasPlan: true }
    else if (path === '/api/admin/users') data = []
    else if (path === '/api/admin/dashboard') data = { byRole: { doctor: 0, pharmacist: 0, patient: 0 } }
    else if (path === '/api/doctor/dashboard') data = { doctor: { id: 'doctor-fixture', role }, stats: { patients: 0, awaitingClarification: 0, prescriptions: 0 }, recentPatients: [], recentActivities: [] }
    else if (path === '/api/pharmacy/dashboard') data = { pharmacist: { id: 'pharmacist-fixture' }, stats: { awaitingClarification: 0, dispensed: 0 }, recentPrescriptions: [] }
    else throw new Error(`Unexpected notification test API request: ${path}`)
    await route.fulfill({ json: data })
  })
  return requests
}

for (const role of roles) {
  for (const width of [1440, 768, 390, 320]) {
    test(`${role} dashboard empty notifications, dismissal and settings at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 720 })
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      const requests = await dashboardFixture(page, role)
      await page.goto(`/${role}/dashboard`)
      const bell = page.getByRole('button', { name: 'Notifications', exact: true })
      const settings = page.getByRole('button', { name: 'Open settings', exact: true })
      await expect(page.getByText(/Welcome, (Dr )?Notification test account/, { exact: true })).toBeVisible()
      await expect(bell).toBeVisible()
      await expect(settings).toBeVisible()
      await expect(page.getByTestId('notification-unread-indicator')).toHaveCount(0)
      expect((await bell.boundingBox()).width).toBe((await settings.boundingBox()).width)
      expect((await bell.boundingBox()).height).toBe(40)
      await page.waitForLoadState('networkidle')
      const requestCount = requests.length

      await bell.focus()
      await page.keyboard.press('Enter')
      const panel = page.getByRole('dialog', { name: 'Notifications', exact: true })
      await expect(panel).toBeVisible()
      await expect(bell).toHaveAttribute('aria-expanded', 'true')
      await expect(panel.getByText("You're all caught up", { exact: true })).toBeVisible()
      await expect(panel.getByRole('status')).toHaveText('0 unread')
      await expect(panel.getByRole('button', { name: 'Mark all as read' })).toBeDisabled()
      await expect(panel.getByRole('button', { name: 'Close notifications' })).toBeFocused()
      const bounds = await panel.boundingBox()
      expect(bounds.x).toBeGreaterThanOrEqual(16)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - 16)
      expect(bounds.y).toBeGreaterThanOrEqual(16)
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(704)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      if (width === 1440 || width === 390) await page.screenshot({ path: testInfo.outputPath(`${role}-notifications-${width}.png`) })

      await page.keyboard.press('Escape')
      await expect(panel).toHaveCount(0)
      await expect(bell).toBeFocused()
      await bell.click()
      await panel.getByRole('button', { name: 'Close notifications' }).click()
      await expect(panel).toHaveCount(0)
      await expect(bell).toBeFocused()
      await bell.click()
      await settings.click()
      await expect(panel).toHaveCount(0)
      const settingsDialog = page.getByRole('dialog', { name: 'Settings', exact: true })
      await expect(settingsDialog).toBeVisible()
      await settingsDialog.getByRole('button', { name: 'Close settings' }).click()
      expect(requests.length).toBe(requestCount)
      expect(errors).toEqual([])
    })
  }
}

async function mountDemo(page, props = {}) {
  await page.goto('/')
  await page.evaluate(async props => {
    const [{ default: React }, { default: ReactDOM }, { default: Harness }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'),
      import('/node_modules/.vite/deps/react-dom_client.js'),
      import('/tests/fixtures/NotificationHarness.jsx'),
    ])
    document.getElementById('root').hidden = true
    const node = document.createElement('div')
    document.body.append(node)
    ReactDOM.createRoot(node).render(React.createElement(React.StrictMode, null, React.createElement(Harness, props)))
  }, props)
}

test('demo unread and mark-as-read state stays isolated between roles', async ({ page }) => {
  await mountDemo(page)
  const bells = Object.fromEntries(roles.map(role => [role, page.getByRole('region', { name: `${role} demo notifications` }).getByRole('button', { name: /^Notifications/ })]))
  for (const role of roles) await expect(bells[role]).toHaveAccessibleName('Notifications, 2 unread')
  await bells.admin.click()
  const panel = page.getByRole('dialog', { name: 'Notifications', exact: true })
  await expect(panel.getByRole('listitem')).toHaveCount(3)
  await expect(panel.locator('time').first()).toHaveAttribute('datetime', '2026-01-01T09:00:00.000Z')
  await expect(panel.getByText('DEMO: review request interface')).toHaveCount(0)
  await panel.getByRole('button', { name: 'Mark DEMO: staff invitation interface as read', exact: true }).click()
  await expect(panel.getByRole('status')).toHaveText('1 unread')
  await expect(panel.getByRole('button', { name: 'Close notifications' })).toBeFocused()
  await panel.getByRole('button', { name: 'Mark all as read' }).click()
  await expect(panel.getByRole('status')).toHaveText('0 unread')
  await expect(panel.getByRole('listitem')).toHaveCount(3)
  await expect(panel.getByText('Read', { exact: true })).toHaveCount(3)
  await expect(page.getByRole('region', { name: 'admin demo notifications' }).getByTestId('notification-unread-indicator')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await bells.admin.click()
  await expect(panel.getByRole('status')).toHaveText('0 unread')
  await page.keyboard.press('Escape')
  await bells.doctor.click()
  await expect(panel.getByRole('status')).toHaveText('2 unread')
  await expect(panel.getByText('DEMO: staff invitation interface')).toHaveCount(0)
  await expect(bells.pharmacist).toHaveAccessibleName('Notifications, 2 unread')
  await page.getByRole('button', { name: 'Outside notification panel' }).click()
  await expect(panel).toHaveCount(0)
})

test('demo account change resets local state, and keyboard focus can leave the non-modal panel', async ({ page }) => {
  await mountDemo(page)
  const bell = page.getByRole('region', { name: 'admin demo notifications' }).getByRole('button', { name: /^Notifications/ })
  await bell.click()
  const panel = page.getByRole('dialog', { name: 'Notifications', exact: true })
  await page.keyboard.press('Tab')
  await expect(panel.getByRole('button', { name: 'Mark DEMO: staff invitation interface as read', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(panel.getByRole('button', { name: 'Mark all as read' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(panel).toHaveCount(0)
  await page.getByRole('button', { name: 'Switch demo account' }).click()
  await expect(page.getByTestId('notification-unread-indicator')).toHaveCount(0)
  await bell.click()
  await expect(panel.getByText("You're all caught up", { exact: true })).toBeVisible()
})

test('long demo lists remain inside a small mobile viewport with a reachable footer', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 })
  await mountDemo(page, { longList: true })
  await page.getByRole('region', { name: 'admin demo notifications' }).getByRole('button', { name: /^Notifications/ }).click()
  const panel = page.getByRole('dialog', { name: 'Notifications', exact: true })
  const bounds = await panel.boundingBox()
  expect(bounds.x).toBeGreaterThanOrEqual(16)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(304)
  expect(bounds.y).toBeGreaterThanOrEqual(16)
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(464)
  await expect(panel.getByRole('button', { name: 'Mark all as read' })).toBeInViewport()
  await panel.getByRole('button', { name: 'Mark all as read' }).click()
  await expect(panel.getByRole('status')).toHaveText('0 unread')
  await expect(panel.getByRole('listitem')).toHaveCount(30)
})


for (const width of [1440, 768, 390, 320]) {
  test(`Doctor panel design, read cards and relative times at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await mountDemo(page, { doctorDesign: true })
    const bell = page.getByRole('region', { name: 'doctor demo notifications' }).getByRole('button', { name: 'Notifications, 1 unread' })
    await bell.click()
    const panel = page.getByRole('dialog', { name: 'Notifications', exact: true })
    await expect(panel).toHaveCSS('border-radius', '24px')
    await expect(panel).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(panel.getByRole('heading', { name: 'Notifications', exact: true })).toHaveCSS('color', 'rgb(48, 49, 61)')
    await expect(panel.getByRole('heading', { name: 'Notifications', exact: true }).locator('../..')).toHaveCSS('border-bottom-style', 'dashed')
    await expect(panel.getByText('Design preview — fictional notifications')).toBeVisible()
    await expect(panel.getByRole('listitem')).toHaveCount(5)
    expect((await panel.boundingBox()).height).toBeLessThanOrEqual(560)
    const items = panel.getByRole('listitem')
    const firstItem = await items.first().boundingBox()
    const secondItem = await items.nth(1).boundingBox()
    expect(secondItem.y - firstItem.y - firstItem.height).toBeCloseTo(8, 0)
    const unreadCard = items.first().getByRole('button')
    await expect(unreadCard).toHaveCSS('background-color', 'rgb(240, 241, 255)')
    await expect(unreadCard).toHaveCSS('border-radius', '20px')
    await expect(unreadCard).toContainText('Clarification Request')
    await expect(unreadCard).toContainText('From Pharm. Elizabeth.')
    await expect(panel.locator('time')).toHaveText(['10 minutes ago', '30 minutes ago', '8 hours ago', '17 hours ago', '31 October 2026, 01:12 PM'])
    await expect(panel.getByTestId('doctor-notification-unread')).toHaveCount(1)
    await expect(items.nth(1).locator(':scope > div')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(items.nth(1).getByTestId('doctor-notification-unread')).toHaveCount(0)
    await expect(panel.getByRole('button', { name: 'Load more', exact: true })).toBeDisabled()
    const bounds = await panel.boundingBox()
    expect(bounds.x).toBeGreaterThanOrEqual(16)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - 16)
    expect(bounds.y).toBeGreaterThanOrEqual(16)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(884)
    if (width >= 768) expect(bounds.y).toBeGreaterThanOrEqual((await bell.boundingBox()).y + (await bell.boundingBox()).height)
    await page.screenshot({ path: testInfo.outputPath(`doctor-design-${width}.png`) })
    await unreadCard.click()
    await expect(panel.getByRole('status')).toHaveText('0 unread')
    await expect(panel.getByTestId('doctor-notification-unread')).toHaveCount(0)
    await expect(panel.getByRole('button', { name: 'Mark Clarification Request as read', exact: true })).toHaveCount(0)
    await expect(panel.getByRole('button', { name: 'Close notifications' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
    await expect(bell).toHaveCount(0) // Its accessible label now correctly says zero unread.
    const readBell = page.getByRole('region', { name: 'doctor demo notifications' }).getByRole('button', { name: 'Notifications', exact: true })
    await expect(readBell).toBeFocused()
    await readBell.click()
    await expect(panel.getByRole('status')).toHaveText('0 unread')
    // The header remains outside the dropdown at every tested viewport.
    await page.getByRole('region', { name: 'doctor demo notifications' }).getByText('Welcome, doctor demo', { exact: true }).click()
    await expect(panel).toHaveCount(0)
  })
}

test('Doctor Load more appends available records locally and stops at the end', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 })
  await mountDemo(page, { doctorDesign: true, doctorOverflow: true })
  const requests = []
  page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()) })
  await page.getByRole('region', { name: 'doctor demo notifications' }).getByRole('button', { name: /^Notifications/ }).click()
  const panel = page.getByRole('dialog', { name: 'Notifications', exact: true })
  await expect(panel.getByRole('listitem')).toHaveCount(5)
  await panel.getByRole('button', { name: 'Load more', exact: true }).click()
  await expect(panel.getByRole('listitem')).toHaveCount(8)
  await expect(panel.getByRole('button', { name: 'Load more', exact: true })).toBeDisabled()
  await expect(panel.getByRole('button', { name: 'Close notifications' })).toBeFocused()
  await panel.getByRole('button', { name: 'Mark all as read' }).click()
  await expect(panel.getByRole('status')).toHaveText('0 unread')
  expect(requests).toEqual([])
})

test('Doctor design preview waits for existing backend session verification', async ({ page }) => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  await dashboardFixture(page, 'doctor', gate)
  await page.goto('/doctor/dashboard?notificationPreview=1')
  const bell = page.getByRole('button', { name: 'Notifications', exact: true })
  await bell.click()
  let panel = page.getByRole('dialog', { name: 'Notifications', exact: true })
  await expect(panel.getByText("You're all caught up", { exact: true })).toBeVisible()
  await expect(panel.getByText('From Pharm. Elizabeth.', { exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')
  release()
  await expect(page.getByText('Welcome, Dr Notification test account', { exact: true })).toBeVisible()
  const previewBell = page.getByRole('button', { name: 'Notifications, 1 unread', exact: true })
  await previewBell.click()
  panel = page.getByRole('dialog', { name: 'Notifications', exact: true })
  await expect(panel.getByText('Design preview — fictional notifications')).toBeVisible()
  await expect(panel.getByRole('listitem')).toHaveCount(5)
})

test('Doctor design preview query does not allow unauthenticated access', async ({ page }) => {
  await page.goto('/doctor/dashboard?notificationPreview=1')
  await expect(page).toHaveURL(/\/doctor\/login$/)
  await expect(page.getByRole('form', { name: 'Login form' })).toBeVisible()
  await expect(page.getByText('From Pharm. Elizabeth.', { exact: true })).toHaveCount(0)
})


for (const cardRole of ['doctor', 'pharmacist']) {
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1440, height: 600 },
  { width: 768, height: 1024 },
  { width: 390, height: 667 },
  { width: 320, height: 480 },
]) {
  test(`${cardRole} long-list stays bounded through all Load more pages at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await mountDemo(page, { [`${cardRole}Design`]: true, [`${cardRole}Overflow`]: true, [`${cardRole}AdditionalCount`]: 45 })
    await page.evaluate(() => document.fonts.ready)
    await page.getByRole('region', { name: `${cardRole} demo notifications` }).getByRole('button', { name: /^Notifications/ }).click()
    const panel = page.getByRole('dialog', { name: 'Notifications', exact: true })
    const list = panel.getByRole('list', { name: 'Notification list' })
    const scroller = list.locator('..')
    const loadMore = panel.getByRole('button', { name: 'Load more', exact: true })
    const initial = await panel.boundingBox()
    const fixedHeader = await panel.getByRole('heading', { name: 'Notifications', exact: true }).boundingBox()
    const fixedFooter = await loadMore.boundingBox()
    const initialPageScroll = await page.evaluate(() => window.scrollY)

    async function assertBounded() {
      const bounds = await panel.boundingBox()
      const maximum = await panel.evaluate(element => parseFloat(getComputedStyle(element).maxHeight))
      expect(maximum).toBeLessThanOrEqual(560)
      expect(maximum).toBeLessThanOrEqual(viewport.height - 100)
      expect(bounds.height).toBeLessThanOrEqual(maximum + 1)
      expect(bounds.x).toBeGreaterThanOrEqual(16)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width - 16)
      expect(bounds.y).toBeGreaterThanOrEqual(16)
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - 16)
      await expect(loadMore).toBeInViewport()
      expect(await panel.evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true)
    }

    await assertBounded()
    for (let count = 5; count < 50; count += 5) {
      await expect(panel.getByRole('listitem')).toHaveCount(count)
      await expect(loadMore).toBeEnabled()
      await loadMore.click()
      await expect(panel.getByRole('listitem')).toHaveCount(count + 5)
      await assertBounded()
    }
    await expect(loadMore).toBeDisabled()
    await expect(panel.getByRole('listitem')).toHaveCount(50)
    const finalBounds = await panel.boundingBox()
    expect(finalBounds.height).toBeLessThanOrEqual(initial.height + 1)
    await expect(scroller).toHaveCSS('overflow-y', 'auto')
    expect(await scroller.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
    expect(await scroller.evaluate(element => element.clientHeight)).toBeGreaterThan(0)

    // A wheel gesture over the list scrolls its own content, not the page/panel.
    const scrollBounds = await scroller.boundingBox()
    await page.mouse.move(scrollBounds.x + scrollBounds.width / 2, scrollBounds.y + scrollBounds.height / 2)
    await page.mouse.wheel(0, 350)
    await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
    expect(await page.evaluate(() => window.scrollY)).toBe(initialPageScroll)
    expect(Math.abs((await panel.getByRole('heading', { name: 'Notifications', exact: true }).boundingBox()).y - fixedHeader.y)).toBeLessThan(1)
    expect(Math.abs((await loadMore.boundingBox()).y - fixedFooter.y)).toBeLessThan(1)
    await scroller.evaluate(element => { element.scrollTop = element.scrollHeight })
    await expect(panel.getByText('DEMO: additional notification 45', { exact: true })).toBeInViewport()
    await expect(loadMore).toBeInViewport()
    await assertBounded()
    await page.screenshot({ path: testInfo.outputPath(`${cardRole}-long-list-${viewport.width}.png`) })
    expect(errors).toEqual([])
  })
}

test(`${cardRole} long-list recomputes its bounds when resized from desktop to mobile`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await mountDemo(page, { [`${cardRole}Design`]: true, [`${cardRole}Overflow`]: true, [`${cardRole}AdditionalCount`]: 45 })
  await page.getByRole('region', { name: `${cardRole} demo notifications` }).getByRole('button', { name: /^Notifications/ }).click()
  const panel = page.getByRole('dialog', { name: 'Notifications', exact: true })
  const loadMore = panel.getByRole('button', { name: 'Load more', exact: true })
  for (let index = 0; index < 3; index += 1) await loadMore.click()
  await expect(panel.getByRole('listitem')).toHaveCount(20)
  await page.setViewportSize({ width: 320, height: 480 })
  await expect.poll(async () => {
    const bounds = await panel.boundingBox()
    return bounds.x >= 16 && bounds.x + bounds.width <= 304 && bounds.y >= 16 && bounds.y + bounds.height <= 464
  }).toBe(true)
  await expect(loadMore).toBeInViewport()
  await loadMore.click()
  await expect(panel.getByRole('listitem')).toHaveCount(25)
  expect(await panel.getByRole('list').locator('..').evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
})

}


for (const width of [1440, 768, 390, 320]) {
  test(`Pharmacist notification design and read state at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await mountDemo(page, { pharmacistDesign: true })
    const region = page.getByRole('region', { name: 'pharmacist demo notifications' })
    const bell = region.getByRole('button', { name: 'Notifications, 1 unread', exact: true })
    await bell.click()
    const panel = page.getByRole('dialog', { name: 'Notifications', exact: true })
    await expect(panel).toHaveCSS('border-radius', '24px')
    await expect(panel).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    const heading = panel.getByRole('heading', { name: 'Notifications', exact: true })
    await expect(heading).toHaveCSS('color', 'rgb(48, 49, 61)')
    await expect(heading.locator('../..')).toHaveCSS('border-bottom-style', 'dashed')
    const items = panel.getByRole('listitem')
    await expect(items).toHaveCount(5)
    const unread = items.first().getByRole('button', { name: 'Mark Verification as read', exact: true })
    await expect(unread).toHaveCSS('background-color', 'rgb(240, 241, 255)')
    await expect(unread).toHaveCSS('border-radius', '20px')
    await expect(unread.locator('svg.lucide-stethoscope')).toHaveCSS('color', 'rgb(122, 141, 213)')
    await expect(unread.getByText('From Dr. Adewale.', { exact: true })).toHaveCSS('color', 'rgb(71, 90, 162)')
    await expect(panel.locator('time')).toHaveText(['10 minutes ago', '30 minutes ago', '8 hours ago', '17 hours ago', '31 October 2026, 01:12 PM'])
    await expect(panel.getByTestId('pharmacist-notification-unread')).toHaveCount(1)
    await expect(items.nth(1).locator('svg.lucide-stethoscope')).toHaveCSS('color', 'rgb(198, 201, 211)')
    await expect(items.nth(1).getByTestId('pharmacist-notification-unread')).toHaveCount(0)
    const firstBounds = await items.first().boundingBox()
    const secondBounds = await items.nth(1).boundingBox()
    expect(secondBounds.y - firstBounds.y - firstBounds.height).toBeCloseTo(8, 0)
    const bounds = await panel.boundingBox()
    expect(bounds.height).toBeLessThanOrEqual(560)
    expect(bounds.x).toBeGreaterThanOrEqual(16)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - 16)
    expect(bounds.y).toBeGreaterThanOrEqual(16)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(884)
    await expect(panel.getByRole('button', { name: 'Load more', exact: true })).toBeDisabled()
    await expect(panel.getByText('Design preview — fictional notifications', { exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`pharmacist-design-${width}.png`) })
    await unread.click()
    await expect(panel.getByRole('status')).toHaveText('0 unread')
    await expect(region.getByTestId('notification-unread-indicator')).toHaveCount(0)
    await expect(panel.getByTestId('pharmacist-notification-unread')).toHaveCount(0)
    await expect(panel.getByRole('button', { name: 'Close notifications' })).toBeFocused()
    await page.keyboard.press('Escape')
    const readBell = region.getByRole('button', { name: 'Notifications', exact: true })
    await expect(readBell).toBeFocused()
    await readBell.click()
    await expect(panel.getByRole('status')).toHaveText('0 unread')
    await readBell.click()
    await expect(panel).toHaveCount(0)
    await readBell.click()
    await region.getByText('Welcome, pharmacist demo', { exact: true }).click()
    await expect(panel).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('Pharmacist pagination adds five records, bulk read is local and Doctor/Admin stay unchanged', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mountDemo(page, { doctorDesign: true, pharmacistDesign: true, pharmacistOverflow: true, pharmacistAdditionalCount: 8 })
  const requests = []
  page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()) })
  const adminBell = page.getByRole('region', { name: 'admin demo notifications' }).getByRole('button', { name: /^Notifications/ })
  await adminBell.click()
  const panel = page.getByRole('dialog', { name: 'Notifications', exact: true })
  await expect(panel).toHaveCSS('border-radius', '16px')
  await expect(panel.getByRole('button', { name: 'Load more', exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')
  const doctorBell = page.getByRole('region', { name: 'doctor demo notifications' }).getByRole('button', { name: /^Notifications/ })
  await doctorBell.click()
  await expect(panel.getByRole('button', { name: 'Mark Clarification Request as read' }).locator('svg.lucide-pill')).toHaveCSS('color', 'rgb(227, 89, 119)')
  await expect(panel.locator('svg.lucide-stethoscope')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.getByRole('region', { name: 'pharmacist demo notifications' }).getByRole('button', { name: /^Notifications/ }).click()
  await expect(panel.getByRole('listitem')).toHaveCount(5)
  await panel.getByRole('button', { name: 'Load more', exact: true }).click()
  await expect(panel.getByRole('listitem')).toHaveCount(10)
  await expect(panel.getByRole('button', { name: 'Load more', exact: true })).toBeEnabled()
  await panel.getByRole('button', { name: 'Load more', exact: true }).click()
  await expect(panel.getByRole('listitem')).toHaveCount(13)
  await expect(panel.getByRole('button', { name: 'Load more', exact: true })).toBeDisabled()
  await panel.getByRole('button', { name: 'Mark all as read' }).click()
  await expect(panel.getByRole('status')).toHaveText('0 unread')
  await expect(doctorBell).toHaveAccessibleName('Notifications, 1 unread')
  await expect(adminBell).toHaveAccessibleName('Notifications, 2 unread')
  expect(requests).toEqual([])
})

test('Pharmacist development examples wait for existing verified authentication', async ({ page }) => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  await dashboardFixture(page, 'pharmacist', gate)
  await page.goto('/pharmacist/dashboard?notificationPreview=1')
  await page.getByRole('button', { name: 'Notifications', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'Notifications', exact: true })
  await expect(panel.getByText("You're all caught up", { exact: true })).toBeVisible()
  await expect(panel.getByText('From Dr. Adewale.', { exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')
  release()
  await expect(page.getByText('Welcome, Notification test account', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Notifications, 1 unread', exact: true }).click()
  await expect(panel.getByText('Design preview — fictional notifications', { exact: true })).toBeVisible()
  await expect(panel.getByRole('listitem')).toHaveCount(5)
})

test('Pharmacist development preview cannot bypass login', async ({ page }) => {
  await page.goto('/pharmacist/dashboard?notificationPreview=1')
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  await expect(page.getByRole('form', { name: 'Login form' })).toBeVisible()
  await expect(page.getByText('From Dr. Adewale.', { exact: true })).toHaveCount(0)
})
