import { test, expect } from '@playwright/test'

// Every API request is intercepted. These accounts exist only in this suite;
// no credentials, mutations, or user records reach the configured backend.
const fixtures = [
  { id: 'delete/doctor?fixture', name: 'Delete modal doctor fixture', email: `${'long-email-'.repeat(9)}@example.test`, phone: '+2348000000000', role: 'doctor', isEmailVerified: true, createdAt: '2026-01-02' },
  { id: 'delete-patient-fixture', name: 'Delete modal patient fixture', email: '', phone: '', role: 'patient', invitationStatus: 'pending', createdAt: '2026-01-01' },
]

async function setup(page, context, { status = 200, gate, offline = false } = {}) {
  let users = fixtures.map(user => ({ ...user }))
  const deletes = [], errors = [], unexpected = []
  page.on('pageerror', error => errors.push(error.message))
  const token = `test.${Buffer.from(JSON.stringify({ sub: 'delete-modal-admin-fixture', role: 'admin', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`
  await page.addInitScript(token => sessionStorage.setItem('medtrailAdminSession', JSON.stringify({ token, role: 'admin' })), token)
  await context.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === 'DELETE') {
      deletes.push({ path, authorization: request.headers().authorization, body: request.postData() })
      if (gate) await gate
      if (offline) return route.abort('failed')
      if (status >= 400) return route.fulfill({ status, json: { message: `Deletion fixture error ${status}` } })
      users = users.filter(user => path !== `/api/admin/users/${encodeURIComponent(user.id)}`)
      return route.fulfill({ json: { message: 'Fixture user deleted successfully.' } })
    }
    if (path === '/api/auth/profile') return route.fulfill({ json: { id: 'delete-modal-admin-fixture', role: 'admin', name: 'Delete modal test admin', isEmailVerified: true, invitationStatus: 'accepted' } })
    if (path === '/api/admin/users') return route.fulfill({ json: users })
    if (path === '/api/admin/invited-users') return route.fulfill({ json: [] })
    if (path.startsWith('/api/admin/resend-invitation/') && request.method() === 'POST') return route.fulfill({ json: { message: 'Fixture invitation resent' } })
    unexpected.push(`${request.method()} ${path}`)
    return route.fulfill({ status: 500, json: { message: 'Unexpected isolated test request' } })
  })
  await page.goto('/admin/users')
  await expect(page.getByText('Welcome, Delete modal test admin', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: `Delete ${fixtures[0].name}`, exact: true })).toBeVisible()
  return { deletes, errors, unexpected, token }
}

const dialogFor = page => page.getByRole('dialog', { name: 'Delete user', exact: true })
const triggerFor = (page, index = 0) => page.getByRole('button', { name: `Delete ${fixtures[index].name}`, exact: true })

for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 667 }, { width: 320, height: 480 }]) {
  test(`Delete modal design, long content and keyboard dismissal at ${viewport.width}px`, async ({ page, context }, testInfo) => {
    await page.setViewportSize(viewport)
    const { deletes, errors, unexpected } = await setup(page, context)
    const trigger = triggerFor(page)
    await trigger.click()
    const dialog = dialogFor(page)
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(dialog.getByText('Are you sure you want to remove this user?', { exact: true })).toBeVisible()
    const rows = dialog.locator('dl > div')
    for (const [index, value] of [fixtures[0].name, fixtures[0].email, fixtures[0].phone, 'Doctor'].entries()) {
      await expect(rows.nth(index).locator('dd')).toHaveText(value)
    }
    const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true })
    const remove = dialog.getByRole('button', { name: 'Remove user', exact: true })
    await expect(cancel).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(remove).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(dialog.getByRole('button', { name: 'Close delete user confirmation' })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(remove).toBeFocused()
    const bounds = await dialog.boundingBox()
    expect(bounds.x).toBeGreaterThanOrEqual(15)
    expect(bounds.y).toBeGreaterThanOrEqual(15)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width - 15)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - 15)
    expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true)
    expect(await dialog.evaluate(node => getComputedStyle(node).borderRadius)).toBe('28px')
    expect(await remove.evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(255, 54, 80)')
    // Both controls are visible together, including on the shortest test screen.
    await remove.scrollIntoViewIfNeeded()
    const cancelBounds = await cancel.boundingBox(), removeBounds = await remove.boundingBox()
    expect(cancelBounds.y).toBe(removeBounds.y)
    expect(removeBounds.y + removeBounds.height).toBeLessThanOrEqual(viewport.height - 15)
    await page.screenshot({ path: testInfo.outputPath(`delete-user-${viewport.width}.png`) })
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
    expect(deletes).toEqual([])
    expect(errors).toEqual([])
    expect(unexpected).toEqual([])
  })
}

test('Cancel, X, backdrop and keyboard never delete; switching users displays the selected record', async ({ page, context }) => {
  const { deletes } = await setup(page, context)
  await triggerFor(page).click()
  const dialog = dialogFor(page)
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(triggerFor(page)).toBeFocused()
  await triggerFor(page, 1).click()
  await expect(dialog.locator('dd').nth(0)).toHaveText(fixtures[1].name)
  await expect(dialog.locator('dd').nth(1)).toHaveText('—')
  await expect(dialog.locator('dd').nth(2)).toHaveText('—')
  await expect(dialog.locator('dd').nth(3)).toHaveText('Patient')
  await page.mouse.click(5, 5)
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Close delete user confirmation' }).click()
  await expect(triggerFor(page, 1)).toBeFocused()
  await triggerFor(page).click()
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog).toHaveCount(0)
  expect(deletes).toEqual([])
})

for (const index of [0, 1]) {
  test(`Confirmed removal only targets selected fixture ${index}, with pending protection`, async ({ page, context }) => {
    let release
    const gate = new Promise(resolve => { release = resolve })
    const { deletes, token, errors, unexpected } = await setup(page, context, { gate })
    await triggerFor(page, index).click()
    const dialog = dialogFor(page)
    await dialog.getByRole('button', { name: 'Remove user', exact: true }).evaluate(node => { node.click(); node.click() })
    await expect(dialog.getByRole('status')).toHaveText('Removing user… Please wait.')
    await expect(dialog.getByRole('button', { name: 'Removing…', exact: true })).toBeDisabled()
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
    await expect(dialog.getByRole('button', { name: 'Close delete user confirmation' })).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(dialog).toBeFocused()
    await expect.poll(() => deletes.length).toBe(1)
    await expect(page.getByRole('cell', { name: fixtures[index].name, exact: true })).toHaveCount(1)
    release()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByText('Fixture user deleted successfully.', { exact: true })).toBeVisible()
    await expect(triggerFor(page, index)).toHaveCount(0)
    await expect(triggerFor(page, 1 - index)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeFocused()
    expect(deletes).toEqual([{ path: `/api/admin/users/${encodeURIComponent(fixtures[index].id)}`, authorization: `Bearer ${token}`, body: null }])
    expect(errors).toEqual([])
    expect(unexpected).toEqual([])
  })
}

for (const failure of [{ status: 403 }, { status: 404 }, { status: 500 }, { offline: true }]) {
  test(`Deletion failure ${failure.status || 'network'} retains the user and allows a safe retry`, async ({ page, context }) => {
    const { deletes, unexpected } = await setup(page, context, failure)
    await triggerFor(page, 1).click()
    const dialog = dialogFor(page)
    const remove = dialog.getByRole('button', { name: 'Remove user', exact: true })
    await remove.click()
    await expect(dialog.getByRole('alert')).toContainText(failure.offline ? 'Unable to connect' : `Deletion fixture error ${failure.status}`)
    await expect(remove).toBeEnabled()
    await expect(page.getByRole('cell', { name: fixtures[1].name, exact: true })).toHaveCount(1)
    await expect(page.getByText('Fixture user deleted successfully.', { exact: true })).toHaveCount(0)
    await remove.click()
    await expect.poll(() => deletes.length).toBe(2)
    await expect(remove).toBeEnabled()
    expect(deletes.every(request => request.path.endsWith(fixtures[1].id))).toBe(true)
    await page.keyboard.press('Escape')
    await triggerFor(page).click()
    await expect(dialog.getByRole('alert')).toHaveCount(0)
    await expect(dialog.locator('dd').first()).toHaveText(fixtures[0].name)
    expect(unexpected).toEqual([])
  })
}

test('Invitation resend remains available without opening the delete modal', async ({ page, context }) => {
  const { deletes, unexpected } = await setup(page, context)
  await page.getByRole('button', { name: `Resend invitation to ${fixtures[1].name}`, exact: true }).click()
  await expect(page.getByText('Invitation resend requested.', { exact: true })).toBeVisible()
  await expect(dialogFor(page)).toHaveCount(0)
  expect(deletes).toEqual([])
  expect(unexpected).toEqual([])
})
