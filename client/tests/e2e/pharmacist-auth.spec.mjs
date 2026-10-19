import { test, expect } from '@playwright/test'

// API fixtures are isolated to browser tests. Application authentication always calls the backend.
const email = 'pharmacist@example.test'
const password = 'UnitTest!123'
const expiresAt = Math.floor(Date.now() / 1000) + 600
const jwt = (role = 'pharmacist', exp = expiresAt) => `test.${Buffer.from(JSON.stringify({ sub: `${role}-fixture`, role, exp })).toString('base64url')}.test`

async function authApi(page, options = {}) {
  const requests = []
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const body = request.postDataJSON()
    requests.push({ path, body, headers: request.headers() })
    const role = options.role || 'pharmacist'
    let status = 200
    let data
    if (path === options.failPath) {
      status = options.status || 400
      data = { message: options.message || 'The code is incorrect or expired.' }
    } else if (path === '/api/auth/validate-invitation') {
      data = { valid: true, name: 'Invited user', email, role: options.invitationRole || 'pharmacist' }
    } else if (path === '/api/auth/login' || path === '/api/auth/complete-registration') {
      data = { accessToken: jwt(role), user: { id: `${role}-fixture`, role, email } }
    } else if (path === '/api/auth/profile') {
      if (options.profileGate) await options.profileGate
      status = options.profileStatus || 200
      data = { id: `${role}-fixture`, role, name: 'Test pharmacist', isEmailVerified: options.verified !== false, invitationStatus: 'accepted' }
    } else if (['forgot-password', 'verify-reset-code', 'reset-password', 'verify-email', 'resend-email-otp'].some(action => path === `/api/auth/${action}`)) {
      data = { message: 'Request completed.' }
    } else {
      status = 500
      data = { message: `Unexpected API request: ${path}` }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
  })
  return requests
}

async function login(page) {
  await page.goto('/pharmacist/login')
  await page.getByLabel('Email address', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

async function resetCode(page, code = '123456') {
  for (let index = 0; index < code.length; index++) await page.getByLabel(`Reset code digit ${index + 1}`).fill(code[index])
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

test('role selection reaches Pharmacist login and form validation blocks invalid requests', async ({ page }) => {
  const requests = await authApi(page)
  await page.goto('/select-role')
  await page.getByRole('button', { name: 'Pharmacist', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByText('This field is required.', { exact: true })).toHaveCount(2)
  await page.getByLabel('Email address', { exact: true }).fill('invalid-email')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByText('Invalid email address.', { exact: true })).toBeVisible()
  expect(requests).toHaveLength(0)
  await expect(page.getByText('Invited to MedTrail?', { exact: false })).toBeVisible()
})

test('login waits for backend profile verification, survives reload, and logout protects the dashboard', async ({ page }) => {
  let release
  const profileGate = new Promise(resolve => { release = resolve })
  const requests = await authApi(page, { profileGate })
  await login(page)
  await expect(page).toHaveURL(/\/pharmacist\/dashboard$/)
  await expect(page.getByRole('status')).toHaveText('Checking your session...')
  await expect(page.getByRole('heading', { name: 'Pharmacist dashboard' })).toHaveCount(0)
  release()
  await expect(page.getByRole('heading', { name: 'Pharmacist dashboard' })).toBeVisible()
  const loginRequest = requests.find(request => request.path === '/api/auth/login')
  expect(loginRequest.body).toEqual({ email, password, role: 'pharmacist' })
  expect(requests.find(request => request.path === '/api/auth/profile').headers.authorization).toBe(`Bearer ${jwt()}`)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pharmacist dashboard' })).toBeVisible()
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPharmacistSession'))).toBeNull()
  await page.goto('/pharmacist/dashboard')
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
})

test('Pharmacist credentials cannot render protected Admin or Doctor pages', async ({ page }) => {
  const requests = await authApi(page)
  await login(page)
  await expect(page.getByRole('heading', { name: 'Pharmacist dashboard' })).toBeVisible()
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('form', { name: 'Login form' })).toBeVisible()
  await page.goto('/doctor/dashboard')
  await expect(page).toHaveURL(/\/doctor\/login$/)
  expect(requests.some(request => /^\/api\/(admin|doctor)\//.test(request.path))).toBe(false)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailAdminSession'))).toBeNull()
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailDoctorSession'))).toBeNull()
})

for (const role of ['admin', 'doctor', 'patient']) {
  test(`${role} login responses cannot establish a Pharmacist session`, async ({ page }) => {
    await authApi(page, { role })
    await login(page)
    await expect(page).toHaveURL(/\/pharmacist\/login$/)
    await expect(page.getByRole('alert')).toContainText('unexpected response')
    expect(await page.evaluate(() => sessionStorage.getItem('medtrailPharmacistSession'))).toBeNull()
  })
}

test('Admin invitation links use the Doctor setup design and establish only a Pharmacist session', async ({ page }) => {
  const requests = await authApi(page)
  await page.goto('/accept-invite?token=invitation-fixture')
  await expect(page).toHaveURL(/\/pharmacist\/create-password\?token=invitation-fixture$/)
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
  await page.getByLabel('Password', { exact: true }).fill('short')
  await page.getByLabel('Confirm Password', { exact: true }).fill('different')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByText('Password does not meet requirements.', { exact: true })).toBeVisible()
  await expect(page.getByText('Passwords do not match.', { exact: true })).toBeVisible()
  expect(requests.some(request => request.path.endsWith('/complete-registration'))).toBe(false)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Pharmacist dashboard' })).toBeVisible()
  expect(requests.find(request => request.path.endsWith('/complete-registration')).body).toEqual({ token: 'invitation-fixture', password, confirmPassword: password })
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailDoctorSession'))).toBeNull()
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailAdminSession'))).toBeNull()
  const stored = await page.evaluate(() => JSON.stringify(sessionStorage))
  expect(stored).not.toContain(password)
  expect(stored).not.toContain('invitation-fixture')
})

test('missing, expired, and wrong-role invitations cannot submit account setup', async ({ page }) => {
  const requests = await authApi(page, { invitationRole: 'doctor' })
  await page.goto('/pharmacist/create-password')
  await expect(page.getByRole('alert')).toContainText('No invitation token')
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
  await page.goto('/pharmacist/create-password?token=wrong-role')
  await expect(page.getByRole('alert')).toContainText('not for a Pharmacist account')
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
  await page.unroute('**/api/**')
  await authApi(page, { failPath: '/api/auth/validate-invitation', message: 'This invitation link has expired.' })
  await page.goto('/pharmacist/create-password?token=expired')
  await expect(page.getByRole('alert')).toContainText('expired')
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
  expect(requests.some(request => request.path.endsWith('/complete-registration'))).toBe(false)
})

test('password recovery uses all three backend endpoints, validates passwords, and returns to Pharmacist login', async ({ page }) => {
  const requests = await authApi(page)
  await page.goto('/pharmacist/login')
  await page.getByRole('button', { name: 'Forgot password?' }).click()
  await expect(page).toHaveURL(/\/pharmacist\/forgot-password$/)
  const recoveryForm = page.getByRole('form', { name: 'Reset password form' })
  await recoveryForm.getByLabel('Email address', { exact: true }).fill(email)
  await recoveryForm.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/verify-reset-code$/)
  await resetCode(page)
  await expect(page).toHaveURL(/\/pharmacist\/new-password$/)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password', { exact: true }).fill('Mismatch!123')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  expect(requests.some(request => request.path.endsWith('/reset-password'))).toBe(false)
  await page.getByLabel('Confirm password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(requests.map(request => [request.path, request.body])).toEqual([
    ['/api/auth/forgot-password', { email }],
    ['/api/auth/verify-reset-code', { email, otp: '123456' }],
    ['/api/auth/reset-password', { email, otp: '123456', newPassword: password }],
  ])
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPharmacistSession'))).toBeNull()
})

test('backend reset-code rejection prevents password reset and direct entry requires recovery state', async ({ page }) => {
  const requests = await authApi(page, { failPath: '/api/auth/verify-reset-code' })
  await page.goto('/pharmacist/new-password')
  await expect(page).toHaveURL(/\/pharmacist\/forgot-password$/)
  await page.getByLabel('Email address', { exact: true }).fill(email)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await resetCode(page)
  await expect(page).toHaveURL(/\/pharmacist\/verify-reset-code$/)
  await expect(page.getByRole('alert')).toContainText('incorrect or expired')
  expect(requests.some(request => request.path.endsWith('/reset-password'))).toBe(false)
})

test('email verification and resend use real endpoints and return to login without creating a session', async ({ page }) => {
  await authApi(page, { failPath: '/api/auth/login', status: 401, message: 'Please verify your email.' })
  await login(page)
  await page.getByRole('button', { name: 'Need to verify your email?' }).click()
  await expect(page).toHaveURL(/\/pharmacist\/verify-email$/)
  await page.unroute('**/api/**')
  const requests = await authApi(page)
  await page.getByRole('button', { name: 'Resend code', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('new verification code')
  for (let index = 0; index < 6; index++) await page.getByLabel(`Verification code digit ${index + 1}`).fill(String(index + 1))
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(requests.map(request => [request.path, request.body])).toEqual([
    ['/api/auth/resend-email-otp', { email }],
    ['/api/auth/verify-email', { email, otp: '123456' }],
  ])
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPharmacistSession'))).toBeNull()
})

test('rejected profiles return to login and server errors offer retry without rendering the dashboard', async ({ page }) => {
  await authApi(page, { profileStatus: 403 })
  const rejectedProfile = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/profile')
  await login(page)
  await rejectedProfile
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  await page.unroute('**/api/**')
  await authApi(page, { profileStatus: 503 })
  await login(page)
  await expect(page.getByRole('alert')).toContainText('Unable to check your session')
  await expect(page.getByRole('heading', { name: 'Pharmacist dashboard' })).toHaveCount(0)
  await page.unroute('**/api/**')
  await authApi(page)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'Pharmacist dashboard' })).toBeVisible()
})

test('session expiry removes access while the dashboard is open', async ({ page }) => {
  await authApi(page)
  await page.goto('/pharmacist/login')
  await page.evaluate(token => sessionStorage.setItem('medtrailPharmacistSession', JSON.stringify({ token })), jwt('pharmacist', Math.floor(Date.now() / 1000) + 3))
  await page.goto('/pharmacist/dashboard')
  await expect(page.getByRole('heading', { name: 'Pharmacist dashboard' })).toBeVisible()
  await expect(page).toHaveURL(/\/pharmacist\/login$/, { timeout: 5000 })
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPharmacistSession'))).toBeNull()
})

test('Doctor invitation acceptance and account setup still authenticate as Doctor', async ({ page }) => {
  await authApi(page, { role: 'doctor', invitationRole: 'doctor' })
  await page.goto('/accept-invite?token=doctor-invitation')
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/accept-invite\?token=doctor-invitation$/)
  await page.goto('/doctor/create-password?token=doctor-invitation')
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL(/\/doctor\/dashboard$/)
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailDoctorSession'))).not.toBeNull()
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPharmacistSession'))).toBeNull()
})

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`shared Doctor and Pharmacist authentication styling at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await authApi(page, { invitationRole: 'doctor' })
    const styles = async () => page.evaluate(() => {
      const selectors = ['main', 'main > section:first-child', 'main > section:last-child', 'form', 'input', 'button[type="submit"]']
      return selectors.map(selector => {
        const node = document.querySelector(selector)
        const css = getComputedStyle(node)
        return [node.className, css.fontFamily, css.fontSize, css.color, css.backgroundColor, css.padding, css.borderRadius, css.width]
      })
    })
    await page.goto('/doctor/login')
    const doctorLoginStyles = await styles()
    await page.goto('/pharmacist/login')
    expect(await styles()).toEqual(doctorLoginStyles)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    await page.goto('/doctor/create-password?token=doctor-invite')
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
    const doctorSetupStyles = await styles()
    await page.unroute('**/api/**')
    await authApi(page)
    await page.goto('/pharmacist/create-password?token=pharmacist-invite')
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
    expect(await styles()).toEqual(doctorSetupStyles)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
  })
}
