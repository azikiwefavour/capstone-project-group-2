import { test, expect } from '@playwright/test'

// Isolated browser fixtures only. Never used by application code or live APIs.
const jwt = () => `test.${Buffer.from(JSON.stringify({ sub: 'dashboard-fixture', role: 'patient', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`

async function authenticatedDashboard(page, name = 'Patient layout review') {
  const requests = []
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    requests.push(path)
    if (path !== '/api/auth/profile') return route.abort()
    return route.fulfill({ json: { id: 'dashboard-fixture', role: 'patient', name, isEmailVerified: true, invitationStatus: 'accepted' } })
  })
  await page.goto('/patient/login')
  await page.evaluate(token => sessionStorage.setItem('medtrailPatientSession', JSON.stringify({ token })), jwt())
  await page.goto('/patient/dashboard')
  await expect(page.getByRole('heading', { name: name ? `Welcome, ${name}` : 'Welcome to MedTrail', exact: true })).toBeVisible()
  return requests
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  test(`Patient desktop dashboard structure and established styles at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const requests = await authenticatedDashboard(page)
    const cards = page.getByRole('region', { name: 'Prescription summary' }).locator('article')
    await expect(cards).toHaveCount(4)
    const boxes = await cards.evaluateAll(elements => elements.map(element => {
      const bounds = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      const icon = getComputedStyle(element.lastElementChild)
      return { top: bounds.top, right: bounds.right, height: bounds.height, border: style.borderColor, background: style.backgroundColor, icon: icon.color, iconBackground: icon.backgroundColor, iconWidth: icon.width }
    }))
    expect(new Set(boxes.map(box => box.top)).size).toBe(1)
    for (const box of boxes) {
      expect(box.height).toBe(110)
      expect(box.right).toBeLessThanOrEqual(viewport.width)
      expect(box.border).toBe('rgb(226, 229, 237)')
      expect(box.background).toBe('rgb(255, 255, 255)')
      expect(box.iconWidth).toBe('53px')
    }
    expect(boxes.map(box => [box.iconBackground, box.icon])).toEqual([
      ['rgb(222, 226, 244)', 'rgb(122, 141, 213)'],
      ['rgb(208, 231, 220)', 'rgb(47, 125, 89)'],
      ['rgb(222, 226, 255)', 'rgb(71, 90, 162)'],
      ['rgb(248, 214, 221)', 'rgb(184, 63, 92)'],
    ])
    await expect(cards.locator('p')).toHaveText(['—', '—', '—', '—'])
    await expect(page.getByText('Prescription records are not available yet.', { exact: true })).toBeVisible()
    await expect(page.getByText('Diagnosis records are not available yet.', { exact: true })).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'Search diagnoses' })).toBeDisabled()
    await expect(page.getByRole('columnheader')).toHaveText(['Diagnosis', 'First recorded', 'Treated with', 'Status'])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(requests.every(path => path === '/api/auth/profile')).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('patient-dashboard.png'), fullPage: true })
  })
}

for (const viewport of [{ width: 1440, height: 929 }, { width: 375, height: 667 }]) {
test(`logout confirmation preserves cancellation and clears only the Patient session at ${viewport.width}px`, async ({ page }) => {
  await page.setViewportSize(viewport)
  await authenticatedDashboard(page)
  await page.evaluate(() => sessionStorage.setItem('medtrailAdminSession', 'preserve-other-role-fixture'))
  const logout = page.getByRole('button', { name: 'Log out', exact: true })
  await logout.click()
  const dialog = page.getByRole('dialog', { name: 'LOG OUT', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(logout).toBeFocused()
  await expect(page).toHaveURL(/\/patient\/dashboard$/)
  await logout.click()
  await dialog.getByRole('button', { name: 'Close log out confirmation' }).click()
  await expect(dialog).toHaveCount(0)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPatientSession'))).not.toBeNull()
  await logout.click()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await logout.click()
  await dialog.getByRole('button', { name: 'Yes, Log out', exact: true }).click()
  await expect(page).toHaveURL(/\/patient\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPatientSession'))).toBeNull()
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailAdminSession'))).toBe('preserve-other-role-fixture')
  await page.goto('/patient/dashboard')
  await expect(page).toHaveURL(/\/patient\/login$/)
})
}

test('missing profile name uses a neutral welcome and smaller screens do not overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await authenticatedDashboard(page, '')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

// Mount only the presentation component in a test-owned document. This exercises
// populated/empty states without adding preview routes or assuming an API exists.
async function renderContent(page, props) {
  await page.route('**/dashboard-component-test', route => route.fulfill({ contentType: 'text/html', body: '<html><body><div id="fixture"></div></body></html>' }))
  await page.goto('/dashboard-component-test')
  await page.evaluate(async props => {
    // The Vite refresh preamble is required when importing transformed JSX directly.
    const RefreshRuntime = (await import('/@react-refresh')).default
    RefreshRuntime.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => type => type
    window.__vite_plugin_react_preamble_installed__ = true
    await import('/src/index.css')
    const { default: React } = await import('/node_modules/.vite/deps/react.js')
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js')
    const { default: Content } = await import('/src/patient/components/PatientDashboardContent.jsx')
    ReactDOM.createRoot(document.getElementById('fixture')).render(React.createElement(Content, props))
  }, props)
}

test('populated presentation counts all prescriptions, shows only active cards, and searches actual supplied diagnoses', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await renderContent(page, {
    patientName: 'Presentation fixture',
    prescriptions: [
      { id: 'active', status: 'active', medicationName: 'Medication fixture', dosage: 'Dose fixture', frequency: 'Frequency fixture', reason: 'Reason fixture', doctorName: 'Doctor fixture', createdAt: '2026-10-17' },
      { id: 'pending', status: 'pending', medicationName: 'Pending fixture' },
      { id: 'discontinued', status: 'discontinued', medicationName: 'Discontinued fixture' },
    ],
    diagnoses: [
      { id: 'a', diagnosis: 'Diagnosis Alpha', firstRecorded: '2026-10-17', treatedWith: 'Medication fixture', status: 'active' },
      { id: 'b', diagnosis: 'Diagnosis Beta', treatedWith: 'Treatment Beta', status: 'resolved' },
    ],
  })
  await expect(page.getByRole('region', { name: 'Prescription summary' }).locator('article p')).toHaveText(['1', '1', '3', '1'])
  const active = page.getByRole('region', { name: 'Active prescriptions', exact: true })
  await expect(active.locator('article')).toHaveCount(1)
  for (const value of ['Medication fixture', 'Dose fixture', 'Frequency fixture', 'Reason fixture', 'Doctor fixture', '17 Oct 2026']) await expect(active.getByText(value, { exact: true })).toBeVisible()
  const search = page.getByRole('searchbox', { name: 'Search diagnoses' })
  await search.fill('  bEtA ')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody')).toContainText('Diagnosis Beta')
  await search.fill('no matching record')
  await expect(page.getByText('No diagnoses match your search.')).toBeVisible()
  await search.fill('')
  await expect(page.locator('tbody tr')).toHaveCount(2)
})

test('confirmed empty presentation shows zero counts and true empty states', async ({ page }) => {
  await renderContent(page, { prescriptions: [], diagnoses: [] })
  await expect(page.getByRole('region', { name: 'Prescription summary' }).locator('article p')).toHaveText(['0', '0', '0', '0'])
  await expect(page.getByText('No active prescriptions yet.', { exact: true })).toBeVisible()
  await expect(page.getByText('No diagnoses recorded yet', { exact: true })).toBeVisible()
  await expect(page.getByRole('searchbox')).toBeEnabled()
  await expect(page.getByRole('navigation', { name: 'Diagnoses pagination' })).toHaveCount(0)
})

// Populated records are isolated test fixtures; the application preview stays empty.
for (const width of [375, 1440]) {
  test(`all diagnosis columns sort before pagination and preserve search at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 929 })
    const ids = Array.from({ length: 25 }, (_, index) => index + 1)
    await renderContent(page, { prescriptions: [], diagnoses: ids.map(id => ({ id: `sort-${id}`, diagnosis: `Test ${String(id).padStart(2, '0')}`, firstRecorded: `2026-10-${String(26 - id).padStart(2, '0')}`, treatedWith: `Treatment ${26 - id}`, status: id % 2 ? 'active' : 'resolved' })) })
    const pageSize = width < 1024 ? 5 : 10
    const next = page.getByRole('navigation', { name: 'Diagnoses pagination' }).getByRole('button', { name: 'Next', exact: true })
    const statuses = [...ids.filter(id => id % 2), ...ids.filter(id => !(id % 2))]
    for (const [label, ascending, descending] of [
      ['Diagnosis', ids, [...ids].reverse()],
      ['First recorded', [...ids].reverse(), ids],
      ['Treated with', [...ids].reverse(), ids],
      ['Status', statuses, [...ids.filter(id => !(id % 2)), ...ids.filter(id => id % 2)]],
    ]) {
      await next.click()
      const header = page.getByRole('columnheader', { name: label, exact: true })
      await header.getByRole('button', { name: label, exact: true }).click()
      await expect(header).toHaveAttribute('aria-sort', 'ascending')
      await expect(page.getByText(`Showing 1–${pageSize} of 25`, { exact: true })).toBeVisible()
      await expect(page.locator('tbody tr td:first-child')).toHaveText(ascending.slice(0, pageSize).map(id => `Test ${String(id).padStart(2, '0')}`))
      await next.click()
      await expect(page.locator('tbody tr td:first-child')).toHaveText(ascending.slice(pageSize, pageSize * 2).map(id => `Test ${String(id).padStart(2, '0')}`))
      await header.getByRole('button', { name: label, exact: true }).click()
      await expect(header).toHaveAttribute('aria-sort', 'descending')
      await expect(page.locator('tbody tr td:first-child')).toHaveText(descending.slice(0, pageSize).map(id => `Test ${String(id).padStart(2, '0')}`))
    }
    await page.getByRole('searchbox').fill('active')
    await expect(page.getByText(`Showing 1–${pageSize} of 13`, { exact: true })).toBeVisible()
    const diagnosis = page.getByRole('columnheader', { name: 'Diagnosis', exact: true })
    await diagnosis.getByRole('button', { name: 'Diagnosis', exact: true }).click()
    await diagnosis.getByRole('button', { name: 'Diagnosis', exact: true }).click()
    await expect(page.locator('tbody tr td:first-child')).toHaveText(ids.filter(id => id % 2).reverse().slice(0, pageSize).map(id => `Test ${String(id).padStart(2, '0')}`))
    await expect(page.getByRole('searchbox')).toHaveValue('active')
    await page.getByRole('searchbox').fill('no matches')
    await expect(page.getByText('No diagnoses match your search.')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Diagnoses pagination' })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 667 }, { width: 320, height: 568 }]) {
  test(`diagnosis pagination and search work at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const desktop = viewport.width >= 1024
    const pageSize = desktop ? 10 : 5
    const diagnoses = Array.from({ length: 25 }, (_, index) => ({ id: `pagination-fixture-${index}`, diagnosis: `Test diagnosis ${index + 1}`, treatedWith: index < 12 ? 'Group Alpha' : 'Group Beta' }))
    await renderContent(page, { prescriptions: [], diagnoses })
    const nav = page.getByRole('navigation', { name: 'Diagnoses pagination' })
    await expect(page.locator('tbody tr')).toHaveCount(pageSize)
    await expect(page.getByText(`Showing 1–${pageSize} of 25`, { exact: true })).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled()
    await nav.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.locator('tbody tr').first()).toContainText(`Test diagnosis ${pageSize + 1}`)
    if (desktop) {
      await nav.getByRole('button', { name: 'Page 3', exact: true }).click()
      await expect(page.getByText('Showing 21–25 of 25', { exact: true })).toBeVisible()
      await expect(page.locator('tbody tr')).toHaveCount(5)
      await expect(nav.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
      await nav.getByRole('button', { name: 'Previous', exact: true }).click()
      await expect(page.getByText('Showing 11–20 of 25', { exact: true })).toBeVisible()
    } else {
      await expect(nav.getByRole('button')).toHaveCount(2)
    }
    const search = page.getByRole('searchbox', { name: 'Search diagnoses' })
    await search.fill('Alpha')
    await expect(page.getByText(`Showing 1–${pageSize} of 12`, { exact: true })).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled()
    await nav.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.locator('tbody tr')).toHaveCount(desktop ? 2 : 5)
    await expect(page.locator('tbody')).not.toContainText('Group Beta')
    await search.fill('Test diagnosis 25')
    await expect(page.locator('tbody tr')).toHaveCount(1)
    await expect(nav).toHaveCount(0)
    await search.fill('no matching records')
    await expect(page.getByText('No diagnoses match your search.')).toBeVisible()
    await expect(nav).toHaveCount(0)
    await search.fill('')
    await expect(page.getByText(`Showing 1–${pageSize} of 25`, { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (!desktop) {
      for (const button of await nav.getByRole('button').all()) {
        const box = await button.boundingBox()
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
      }
    }
    await expect(page).toHaveURL(/\/dashboard-component-test$/)
  })
}

test('resizing changes diagnosis page size and clamps the current page safely', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await renderContent(page, { prescriptions: [], diagnoses: Array.from({ length: 11 }, (_, index) => ({ id: `resize-fixture-${index}`, diagnosis: `Resize fixture ${index + 1}` })) })
  const next = page.getByRole('navigation', { name: 'Diagnoses pagination' }).getByRole('button', { name: 'Next', exact: true })
  await next.click()
  await next.click()
  await expect(page.getByText('Showing 11–11 of 11')).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.getByText('Showing 11–11 of 11')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Previous', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(10)
})

for (const width of [375, 390, 414, 430]) {
  test(`Patient mobile dashboard grid, records and pagination at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/patient/preview/dashboard')
    const cards = page.getByRole('region', { name: 'Prescription summary' }).locator('article')
    await expect(cards).toHaveCount(4)
    const geometry = await cards.evaluateAll(elements => elements.map(element => {
      const card = element.getBoundingClientRect()
      const icon = element.lastElementChild.getBoundingClientRect()
      const count = element.querySelector('p').getBoundingClientRect()
      return { top: card.top, left: card.left, right: card.right, iconBottom: icon.bottom, countTop: count.top, iconColor: getComputedStyle(element.lastElementChild).backgroundColor }
    }))
    expect(geometry[0].top).toBe(geometry[1].top)
    expect(geometry[2].top).toBe(geometry[3].top)
    expect(geometry[2].top).toBeGreaterThan(geometry[0].top)
    expect(geometry[0].left).toBe(geometry[2].left)
    expect(geometry.map(card => card.iconColor)).toEqual(['rgb(254, 243, 199)', 'rgb(248, 214, 221)', 'rgb(222, 226, 255)', 'rgb(226, 229, 237)'])
    for (const card of geometry) { expect(card.iconBottom).toBeLessThan(card.countTop); expect(card.right).toBeLessThanOrEqual(width) }
    await expect(cards.locator('p')).toHaveText(['0', '0', '0', '0'])
    await expect(page.getByText('No active prescriptions yet.', { exact: true })).toBeVisible()
    await expect(page.getByText('No diagnoses recorded yet', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Log out', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'LOG OUT', exact: true })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.screenshot({ path: testInfo.outputPath('mobile-dashboard.png'), fullPage: true })

    // Isolated fixtures exercise populated UI; no clinical records reach a live route.
    await renderContent(page, {
      patientName: 'Responsive test fixture',
      prescriptions: Array.from({ length: 2 }, (_, index) => ({ id: `mobile-prescription-${index}`, status: 'active', medicationName: `Test medication ${index}`, dosage: 'Test dosage', frequency: 'Test frequency', reason: 'Test reason', doctorName: 'Test doctor', createdAt: '2026-10-17' })),
      diagnoses: Array.from({ length: 51 }, (_, index) => ({ id: `mobile-diagnosis-${index}`, diagnosis: `Test diagnosis ${index + 1}`, treatedWith: index < 16 ? 'Filter Alpha' : 'Filter Beta', status: 'Test status' })),
    })
    const active = page.getByRole('region', { name: 'Active prescriptions', exact: true }).locator('article')
    await expect(active).toHaveCount(2)
    const first = await active.nth(0).boundingBox(), second = await active.nth(1).boundingBox()
    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height)
    for (const field of ['Test dosage', 'Test frequency', 'Test reason', 'Test doctor']) await expect(active.first().getByText(field, { exact: true })).toBeVisible()
    const tableRegion = page.getByRole('region', { name: 'Diagnosis table', exact: true })
    const scrolling = await tableRegion.evaluate(element => { element.scrollLeft = element.scrollWidth; return { overflow: element.scrollWidth > element.clientWidth, scrollLeft: element.scrollLeft } })
    expect(scrolling.overflow).toBe(true)
    expect(scrolling.scrollLeft).toBeGreaterThan(0)
    await page.getByRole('columnheader', { name: 'Status', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('columnheader', { name: 'Status', exact: true })).toBeInViewport()
    await expect(page.locator('tbody tr')).toHaveCount(5)
    const nav = page.getByRole('navigation', { name: 'Diagnoses pagination' })
    await expect(nav.getByRole('button')).toHaveCount(2)
    for (let index = 0; index < 10; index++) await nav.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.getByText('Showing 51–51 of 51', { exact: true })).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
    await page.getByRole('searchbox').fill('Alpha')
    await expect(page.getByText('Showing 1–5 of 16', { exact: true })).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('mobile-records-test-only.png'), fullPage: true })
  })
}
