import { test, expect } from '@playwright/test'

const expiry = Math.floor(Date.now() / 1000) + 600
const token = role => `test.${Buffer.from(JSON.stringify({ sub: `${role}-fixture`, role, exp: expiry })).toString('base64url')}.test`
const key = role => `medtrail${role[0].toUpperCase()}${role.slice(1)}Session`

async function blockApi(page) {
  const requests = []
  await page.route('**/api/**', route => { requests.push(route.request().url()); return route.abort() })
  return requests
}

async function loginStyles(page) {
  return page.getByRole('form', { name: 'Login form', exact: true }).evaluate(form => {
    const read = node => {
      const style = getComputedStyle(node), bounds = node.getBoundingClientRect()
      return { width: bounds.width, height: bounds.height, fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, color: style.color, background: style.backgroundColor, opacity: style.opacity, radius: style.borderRadius, border: style.borderColor }
    }
    return { heading: { ...read(form.querySelector('h2')), width: null, height: null }, email: read(form.querySelector('#email')), password: read(form.querySelector('#password')), button: read(form.querySelector('button[type="submit"]')) }
  })
}

for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 414, height: 896 }, { width: 430, height: 932 }, { width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1440, height: 929 }]) {
  test(`Super Admin reuses Admin login styles and password visibility at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const requests = await blockApi(page)
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible()
    const admin = await loginStyles(page)
    await page.goto('/super-admin/login')
    await expect(page.getByRole('heading', { name: 'Super Admin Login', exact: true })).toBeVisible()
    expect(await loginStyles(page)).toEqual(admin)
    await expect(page.getByRole('status')).toHaveCount(0)
    await expect(page.getByText('Super Admin accounts are managed by MedTrail.', { exact: false })).toHaveCount(0)
    const password = page.getByLabel('Password', { exact: true })
    await password.fill('Isolated test value')
    await expect(password).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Show password', exact: true }).click()
    await expect(password).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Hide password', exact: true }).click()
    await expect(password).toHaveAttribute('type', 'password')
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Forgot password?', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Create one', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Select role', exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Continue', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeInViewport()
    expect(requests).toEqual([])
    await page.screenshot({ path: testInfo.outputPath(`super-admin-login-${viewport.width}.png`), fullPage: true })
  })
}

for (const role of [null, 'admin', 'doctor', 'pharmacist', 'patient']) {
  test(`Super Admin boundary denies ${role || 'anonymous'} access without changing other role sessions`, async ({ page }) => {
    const requests = await blockApi(page)
    const sessions = role ? Object.fromEntries(['admin', 'doctor', 'pharmacist', 'patient'].map(value => [key(value), JSON.stringify({ token: token(value), ...(value === 'admin' ? { role: value } : {}) })])) : {}
    if (role) sessions.medtrailSuperAdminSession = JSON.stringify({ token: token(role), role })
    await page.addInitScript(sessions => { for (const [key, value] of Object.entries(sessions)) sessionStorage.setItem(key, value) }, sessions)
    for (const path of ['/super-admin', '/super-admin/dashboard', '/super-admin/facilities', '/super-admin/subscriptions', '/super-admin/payments', '/super-admin/messaging', '/super-admin/system-health', '/super-admin/audit-log', '/super-admin/users', '/super-admin/forgot-password', '/super-admin/create-account']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/super-admin\/login$/)
      await expect(page.getByRole('heading', { name: 'Super Admin Login', exact: true })).toBeVisible()
      expect(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, sessionStorage.getItem(key)])), Object.keys(sessions).filter(key => key !== 'medtrailSuperAdminSession'))).toEqual(Object.fromEntries(Object.entries(sessions).filter(([key]) => key !== 'medtrailSuperAdminSession')))
    }
    expect(requests).toEqual([])
  })
}

test('invalid Super Admin credentials use the existing inline error', async ({ page }) => {
  const requests = []
  await page.route('**/api/**', route => {
    requests.push(route.request().postDataJSON())
    return route.fulfill({ status: 401, json: { message: 'Invalid email or password.' } })
  })
  await page.goto('/super-admin/login')
  await page.getByLabel('Email address', { exact: true }).fill('isolated@example.test')
  await page.getByLabel('Password', { exact: true }).fill('Isolated test input')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Invalid email or password.')
  await expect(page).toHaveURL(/\/super-admin\/login$/)
  expect(requests).toEqual([{ email: 'isolated@example.test', password: 'Isolated test input', role: 'super_admin' }])
})

test('Super Admin is not offered in public role selection or registration', async ({ page }) => {
  const requests = await blockApi(page)
  await page.goto('/select-role')
  await expect(page.getByRole('button', { name: 'Super Admin', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Admin', exact: true })).toBeVisible()
  await page.goto('/create-account')
  await expect(page.getByRole('heading', { name: /Super Admin/ })).toHaveCount(0)
  expect(requests).toEqual([])
})

for (const [path, role] of [['/login', 'admin'], ['/doctor/login', 'doctor'], ['/pharmacist/login', 'pharmacist'], ['/patient/login', 'patient']]) {
  test(`${role} login retains its normal role request and recovery navigation`, async ({ page }) => {
    const requests = []
    await page.route('**/api/**', route => {
      const request = route.request()
      requests.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() })
      return route.fulfill({ status: 401, json: { message: 'Isolated credential rejection' } })
    })
    await page.goto(path)
    await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
    await page.getByLabel('Email address', { exact: true }).fill('isolated@example.test')
    await page.getByLabel('Password', { exact: true }).fill('Isolated test input')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Isolated credential rejection')
    expect(requests).toEqual([{ path: '/api/auth/login', body: { email: 'isolated@example.test', password: 'Isolated test input', role } }])
    await page.getByRole('button', { name: 'Forgot password?', exact: true }).click()
    await expect(page).toHaveURL(role === 'admin' ? /\/forgot-password$/ : new RegExp(`/${role}/forgot-password$`))
    if (role === 'admin') {
      await page.goto('/login')
      await page.getByRole('button', { name: 'Create one', exact: true }).click()
      await expect(page).toHaveURL(/\/create-account$/)
    }
  })
}

test('short mobile screens retain scroll access to inputs and controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 320 })
  const requests = await blockApi(page)
  await page.goto('/super-admin/login')
  for (const label of ['Email address', 'Password']) {
    const field = page.getByLabel(label, { exact: true })
    await field.scrollIntoViewIfNeeded()
    await field.focus()
    await expect(field).toBeInViewport()
  }
  const button = page.getByRole('button', { name: 'Continue', exact: true })
  await button.scrollIntoViewIfNeeded()
  await expect(button).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(requests).toEqual([])
})

const superProfile = { id: 'super_admin-fixture', role: 'super_admin', isEmailVerified: true, name: 'Isolated account', email: 'isolated@example.test' }
async function successfulApi(page, profile = superProfile) {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/login') return route.fulfill({ json: { accessToken: token('super_admin'), user: { id: superProfile.id, role: 'super_admin' } } })
    if (path === '/api/auth/profile') return route.fulfill({ json: profile })
    return route.abort()
  })
}
async function submitSuperLogin(page) {
  await page.goto('/super-admin/login')
  await page.getByLabel('Email address', { exact: true }).fill('isolated@example.test')
  await page.getByLabel('Password', { exact: true }).fill('Isolated test input')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

test('verified login reaches existing pages, survives refresh, and logs out without affecting Admin', async ({ page }) => {
  await successfulApi(page)
  await page.goto('/super-admin/login')
  const admin = JSON.stringify({ token: token('admin'), role: 'admin' })
  await page.evaluate(value => sessionStorage.setItem('medtrailAdminSession', value), admin)
  await submitSuperLogin(page)
  await expect(page).toHaveURL(/\/super-admin\/overview$/)
  await expect(page.getByRole('heading', { name: 'Platform overview' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Platform overview' })).toBeVisible()
  for (const path of ['facilities', 'subscriptions', 'payments', 'messaging', 'system-health', 'audit-log']) {
    await page.goto(`/super-admin/${path}`)
    await expect(page.locator('[data-super-admin-layout]')).toBeVisible()
  }
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await page.getByRole('button', { name: 'Yes, Log out', exact: true }).click()
  await expect(page).toHaveURL(/\/super-admin\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailSuperAdminSession'))).toBeNull()
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailAdminSession'))).toBe(admin)
  await page.goto('/super-admin/overview')
  await expect(page).toHaveURL(/\/super-admin\/login$/)
})

for (const overrides of [{ role: 'admin' }, { id: 'wrong-identity' }, { isEmailVerified: false }]) {
  test(`login rejects trusted profile mismatch ${JSON.stringify(overrides)}`, async ({ page }) => {
    await successfulApi(page, { ...superProfile, ...overrides })
    await submitSuperLogin(page)
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/super-admin\/login$/)
    expect(await page.evaluate(() => sessionStorage.getItem('medtrailSuperAdminSession'))).toBeNull()
  })
}

test('restored session stays hidden until profile verification; failures offer retry', async ({ page }) => {
  let mode = 'offline'
  await page.route('**/api/auth/profile', route => mode === 'offline' ? route.abort() : route.fulfill({ json: superProfile }))
  await page.addInitScript(jwt => sessionStorage.setItem('medtrailSuperAdminSession', JSON.stringify({ token: jwt })), token('super_admin'))
  await page.goto('/super-admin/overview')
  await expect(page.getByRole('alert')).toContainText('Unable to check your session')
  await expect(page.getByRole('heading', { name: 'Platform overview' })).toHaveCount(0)
  mode = 'ready'
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'Platform overview' })).toBeVisible()
})

test('active session expires and returns to login', async ({ page }) => {
  await page.clock.install()
  await successfulApi(page)
  await submitSuperLogin(page)
  await expect(page.getByRole('heading', { name: 'Platform overview' })).toBeVisible()
  await page.clock.fastForward(601000)
  await expect(page).toHaveURL(/\/super-admin\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailSuperAdminSession'))).toBeNull()
})

for (const status of [401, 403, 404]) {
  test(`restored token rejected by backend (${status}) redirects to login`, async ({ page }) => {
    await page.route('**/api/auth/profile', route => route.fulfill({ status, json: { message: 'Session rejected' } }))
    await page.addInitScript(jwt => sessionStorage.setItem('medtrailSuperAdminSession', JSON.stringify({ token: jwt })), token('super_admin'))
    await page.goto('/super-admin/overview')
    await expect(page).toHaveURL(/\/super-admin\/login$/)
    expect(await page.evaluate(() => sessionStorage.getItem('medtrailSuperAdminSession'))).toBeNull()
  })
}
