import { test, expect } from '@playwright/test'

const users = [
  { id: 'edit-doctor-fixture', name: 'Edit doctor fixture', email: 'edit-doctor@example.test', phone: '+2348000000000', role: 'doctor', isEmailVerified: true },
  { id: 'edit-pharmacist-fixture', name: 'Edit pharmacist fixture', email: 'edit-pharmacist@example.test', phone: '+44 7700 900000', role: 'pharmacist', isEmailVerified: true },
]
const dialogFor = page => page.getByRole('dialog', { name: 'Edit user details', exact: true })

async function managementFixture(page, context) {
  const writes = []
  const token = `test.${Buffer.from(JSON.stringify({ sub: 'edit-admin-fixture', role: 'admin', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`
  await page.addInitScript(token => sessionStorage.setItem('medtrailAdminSession', JSON.stringify({ token, role: 'admin' })), token)
  await context.route('**/api/**', route => {
    const request = route.request(), path = new URL(request.url()).pathname
    if (request.method() !== 'GET') {
      writes.push({ path, method: request.method() })
      return route.fulfill({ status: 500, json: { message: 'Unexpected test mutation' } })
    }
    if (path === '/api/auth/profile') return route.fulfill({ json: { id: 'edit-admin-fixture', name: 'Edit admin fixture', role: 'admin', isEmailVerified: true, invitationStatus: 'accepted' } })
    if (path === '/api/admin/users') return route.fulfill({ json: users })
    if (path === '/api/admin/invited-users') return route.fulfill({ json: [] })
    return route.fulfill({ status: 500, json: { message: 'Unexpected isolated test request' } })
  })
  await page.goto('/admin/users')
  await expect(page.getByText('Welcome, Edit admin fixture', { exact: true })).toBeVisible()
  return writes
}

for (const width of [1440, 768, 390, 320]) {
  test(`Management edit modal populates selected values and stays within ${width}px viewport`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width, height: width === 320 ? 480 : 800 })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const writes = await managementFixture(page, context)
    const trigger = page.getByRole('button', { name: `Edit ${users[1].name}`, exact: true })
    await trigger.click()
    const dialog = dialogFor(page)
    await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue(users[1].name)
    await expect(dialog.getByLabel('Email address', { exact: true })).toHaveValue(users[1].email)
    await expect(dialog.getByLabel('Phone number', { exact: true })).toHaveValue(users[1].phone)
    await expect(dialog.getByLabel('Role', { exact: true })).toHaveValue('Pharmacist')
    await expect(dialog.getByLabel('Role', { exact: true })).toBeDisabled()
    await expect(dialog.getByLabel('Name', { exact: true })).toBeFocused()
    await dialog.getByLabel('Name', { exact: true }).fill('Unsaved fixture edit')
    await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    await expect(dialog.getByRole('status')).toContainText('Admin API does not yet support updating')
    // Even programmatic form submission must not invent an API request.
    await dialog.locator('form').evaluate(node => node.requestSubmit())
    expect(writes).toEqual([])
    const bounds = await dialog.boundingBox()
    expect(bounds.width).toBe(Math.min(500, width - 32))
    expect(bounds.x).toBeGreaterThanOrEqual(15)
    expect(bounds.y).toBeGreaterThanOrEqual(15)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual((width === 320 ? 480 : 800) - 15)
    expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true)
    await dialog.getByRole('button', { name: 'Save changes' }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`edit-user-${width}.png`) })
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await trigger.click()
    await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue(users[1].name)
    await dialog.getByRole('button', { name: 'Close edit user details' }).click()
    await page.getByRole('button', { name: `Edit ${users[0].name}`, exact: true }).click()
    await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue(users[0].name)
    await expect(dialog.getByLabel('Role', { exact: true })).toHaveValue('Doctor')
    await expect(dialog.getByLabel('Phone number', { exact: true })).toHaveValue(users[0].phone)
    expect(writes).toEqual([])
    expect(errors).toEqual([])
  })
}

async function mountHarness(page, props = {}) {
  // Test fixtures and callbacks are loaded only by this test runner, never App.
  await page.route('**/api/**', route => route.fulfill({ status: 500, json: { message: 'No API calls allowed in component fixtures' } }))
  await page.goto('/')
  await page.evaluate(async props => {
    const [{ default: React }, { default: ReactDOM }, { default: Harness }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/tests/fixtures/EditUserHarness.jsx'),
    ])
    document.getElementById('root').hidden = true
    const node = document.createElement('div')
    document.body.append(node)
    ReactDOM.createRoot(node).render(React.createElement(React.StrictMode, null, React.createElement(Harness, props)))
  }, props)
  await page.getByRole('button', { name: 'Edit edit-doctor-fixture', exact: true }).click()
}

test('validation blocks malformed changes without losing edits or invoking save', async ({ page }) => {
  await mountHarness(page)
  const dialog = dialogFor(page)
  await dialog.getByLabel('Name', { exact: true }).fill(' ')
  await dialog.getByLabel('Email address', { exact: true }).fill('invalid')
  await dialog.getByLabel('Phone number', { exact: true }).fill('+12')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  for (const label of ['Name', 'Email address', 'Phone number']) await expect(dialog.getByLabel(label, { exact: true })).toHaveAttribute('aria-invalid', 'true')
  await expect(dialog.getByText('Enter a name.', { exact: true })).toBeVisible()
  await expect(dialog.getByLabel('Email address', { exact: true })).toHaveValue('invalid')
  await expect(page.getByLabel('Save calls', { exact: true })).toHaveText('[]')
})

test('test-only save preserves role, uses selected ID and blocks duplicate submissions while pending', async ({ page }) => {
  await mountHarness(page)
  const dialog = dialogFor(page)
  await dialog.getByLabel('Name', { exact: true }).fill(' Changed doctor fixture ')
  await dialog.getByLabel('Email address', { exact: true }).fill('changed@example.test')
  await dialog.getByLabel('Phone number', { exact: true }).fill('+44 7700 900001')
  await dialog.getByLabel('Role', { exact: true }).evaluate(node => { node.value = 'Admin' })
  await dialog.getByRole('button', { name: 'Save changes' }).evaluate(node => { node.click(); node.click() })
  await expect(dialog.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  await expect(dialog.getByLabel('Name', { exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Close edit user details' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('User details updated successfully.', { exact: true })).toHaveAttribute('role', 'status')
  const calls = JSON.parse(await page.getByLabel('Save calls', { exact: true }).textContent())
  expect(calls).toEqual([{ id: users[0].id, changes: { name: 'Changed doctor fixture', email: 'changed@example.test', phone: '+44 7700 900001' } }])
  await expect(page.getByRole('region', { name: users[1].id })).toContainText(users[1].name)
  await page.getByRole('button', { name: 'Edit edit-doctor-fixture', exact: true }).click()
  await expect(dialog.getByLabel('Role', { exact: true })).toHaveValue('Doctor')
  await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue('Changed doctor fixture')
})

test('failed test-only save retains edits, allows retry and does not change another user', async ({ page }) => {
  await mountHarness(page, { fail: true })
  const dialog = dialogFor(page)
  await dialog.getByLabel('Name', { exact: true }).fill('Unsaved doctor fixture')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Test-only save failure. Please try again.')
  await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue('Unsaved doctor fixture')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  expect(JSON.parse(await page.getByLabel('Save calls', { exact: true }).textContent())).toHaveLength(2)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Edit edit-pharmacist-fixture', exact: true }).click()
  await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue(users[1].name)
  await expect(dialog.getByRole('alert')).toHaveCount(0)
})

test('closing with X or Escape discards fixture edits and keyboard focus stays in the modal', async ({ page }) => {
  await mountHarness(page)
  const dialog = dialogFor(page), close = dialog.getByRole('button', { name: 'Close edit user details' })
  await dialog.getByLabel('Name', { exact: true }).fill('Unsaved fixture')
  await close.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await close.click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Edit edit-doctor-fixture', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Edit edit-doctor-fixture', exact: true }).click()
  await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue(users[0].name)
  await page.keyboard.press('Escape')
  await expect(page.getByLabel('Save calls', { exact: true })).toHaveText('[]')
})
