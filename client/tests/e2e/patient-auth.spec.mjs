import { test, expect } from '@playwright/test'

// API fixtures are isolated to browser tests. Application authentication always calls the backend.
const email = 'patient@example.test'
const password = 'UnitTest!123'
const expiresAt = Math.floor(Date.now() / 1000) + 600
const jwt = (role = 'patient', exp = expiresAt) => `test.${Buffer.from(JSON.stringify({ sub: `${role}-fixture`, role, exp })).toString('base64url')}.test`

async function authApi(page, options = {}) {
  const requests = []
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const body = request.postDataJSON()
    requests.push({ path, body, headers: request.headers() })
    const role = options.role || 'patient'
    let status = 200
    let data
    if (path === options.failPath) {
      status = options.status || 400
      data = { message: options.message || 'The code is incorrect or expired.' }
    } else if (path === '/api/auth/validate-invitation') {
      data = { valid: true, name: 'Invited user', email, role: options.invitationRole || 'patient' }
    } else if (path === '/api/auth/login' || path === '/api/auth/complete-registration') {
      data = { accessToken: jwt(role), user: { id: `${role}-fixture`, role, email } }
    } else if (path === '/api/auth/profile') {
      if (options.profileGate) await options.profileGate
      status = options.profileStatus || 200
      data = { id: `${role}-fixture`, role, name: 'Test patient', isEmailVerified: options.verified !== false, invitationStatus: 'accepted' }
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
  await page.goto('/patient/login')
  await page.getByLabel('Email address', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

async function resetCode(page, code = '123456') {
  for (let index = 0; index < code.length; index++) await page.getByLabel(`Reset code digit ${index + 1}`).fill(code[index])
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

test('role selection reaches Patient login and form validation blocks invalid requests', async ({ page }) => {
  const requests = await authApi(page)
  await page.goto('/select-role')
  await page.getByRole('button', { name: 'Patient', exact: true }).click()
  await expect(page).toHaveURL(/\/patient\/login$/)
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
  await expect(page).toHaveURL(/\/patient\/dashboard$/)
  await expect(page.getByRole('status')).toHaveText('Checking your session...')
  await expect(page.getByRole('heading', { name: 'Welcome, Test patient' })).toHaveCount(0)
  release()
  await expect(page.getByRole('heading', { name: 'Welcome, Test patient' })).toBeVisible()
  const loginRequest = requests.find(request => request.path === '/api/auth/login')
  expect(loginRequest.body).toEqual({ email, password, role: 'patient' })
  expect(requests.find(request => request.path === '/api/auth/profile').headers.authorization).toBe(`Bearer ${jwt()}`)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Welcome, Test patient' })).toBeVisible()
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await page.getByRole('button', { name: 'Yes, Log out', exact: true }).click()
  await expect(page).toHaveURL(/\/patient\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPatientSession'))).toBeNull()
  await page.goto('/patient/dashboard')
  await expect(page).toHaveURL(/\/patient\/login$/)
})

test('Patient credentials cannot render protected Admin, Doctor, or Pharmacist pages', async ({ page }) => {
  const requests = await authApi(page)
  await login(page)
  await expect(page.getByRole('heading', { name: 'Welcome, Test patient' })).toBeVisible()
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('form', { name: 'Login form' })).toBeVisible()
  await page.goto('/doctor/dashboard')
  await expect(page).toHaveURL(/\/doctor\/login$/)
  await page.goto('/pharmacist/dashboard')
  await expect(page).toHaveURL(/\/pharmacist\/login$/)
  expect(requests.some(request => /^\/api\/(admin|doctor|pharmacist)\//.test(request.path))).toBe(false)
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailAdminSession'))).toBeNull()
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailDoctorSession'))).toBeNull()
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPharmacistSession'))).toBeNull()
})

for (const role of ['admin', 'doctor', 'pharmacist']) {
  test(`${role} login responses cannot establish a Patient session`, async ({ page }) => {
    await authApi(page, { role })
    await login(page)
    await expect(page).toHaveURL(/\/patient\/login$/)
    await expect(page.getByRole('alert')).toContainText('unexpected response')
    expect(await page.evaluate(() => sessionStorage.getItem('medtrailPatientSession'))).toBeNull()
  })
}

test('Admin invitation links use the Doctor setup design and establish only a Patient session', async ({ page }) => {
  const requests = await authApi(page)
  await page.goto('/accept-invite?token=invitation-fixture')
  await expect(page).toHaveURL(/\/patient\/create-password\?token=invitation-fixture$/)
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
  await expect(page.getByRole('heading', { name: 'Welcome, Test patient' })).toBeVisible()
  expect(requests.find(request => request.path.endsWith('/complete-registration')).body).toEqual({ token: 'invitation-fixture', password, confirmPassword: password })
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailDoctorSession'))).toBeNull()
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailAdminSession'))).toBeNull()
  const stored = await page.evaluate(() => JSON.stringify(sessionStorage))
  expect(stored).not.toContain(password)
  expect(stored).not.toContain('invitation-fixture')
})

test('missing, expired, and wrong-role invitations cannot submit account setup', async ({ page }) => {
  const requests = await authApi(page, { invitationRole: 'doctor' })
  await page.goto('/patient/create-password')
  await expect(page.getByRole('alert')).toContainText('No invitation token')
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
  await page.goto('/patient/create-password?token=wrong-role')
  await expect(page.getByRole('alert')).toContainText('not for a Patient account')
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
  await page.unroute('**/api/**')
  await authApi(page, { failPath: '/api/auth/validate-invitation', message: 'This invitation link has expired.' })
  await page.goto('/patient/create-password?token=expired')
  await expect(page.getByRole('alert')).toContainText('expired')
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
  expect(requests.some(request => request.path.endsWith('/complete-registration'))).toBe(false)
})

test('password recovery uses all three backend endpoints, validates passwords, and returns to Patient login', async ({ page }) => {
  const requests = await authApi(page)
  await page.goto('/patient/login')
  await page.getByRole('button', { name: 'Forgot password?' }).click()
  await expect(page).toHaveURL(/\/patient\/forgot-password$/)
  const recoveryForm = page.getByRole('form', { name: 'Reset password form' })
  await recoveryForm.getByLabel('Email address', { exact: true }).fill(email)
  await recoveryForm.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL(/\/patient\/verify-reset-code$/)
  await resetCode(page)
  await expect(page).toHaveURL(/\/patient\/new-password$/)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password', { exact: true }).fill('Mismatch!123')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  expect(requests.some(request => request.path.endsWith('/reset-password'))).toBe(false)
  await page.getByLabel('Confirm password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL(/\/patient\/login$/)
  expect(requests.map(request => [request.path, request.body])).toEqual([
    ['/api/auth/forgot-password', { email }],
    ['/api/auth/verify-reset-code', { email, otp: '123456' }],
    ['/api/auth/reset-password', { email, otp: '123456', newPassword: password }],
  ])
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPatientSession'))).toBeNull()
})

test('backend reset-code rejection prevents password reset and direct entry requires recovery state', async ({ page }) => {
  const requests = await authApi(page, { failPath: '/api/auth/verify-reset-code' })
  await page.goto('/patient/new-password')
  await expect(page).toHaveURL(/\/patient\/forgot-password$/)
  await page.getByLabel('Email address', { exact: true }).fill(email)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await resetCode(page)
  await expect(page).toHaveURL(/\/patient\/verify-reset-code$/)
  await expect(page.getByRole('alert')).toContainText('incorrect or expired')
  expect(requests.some(request => request.path.endsWith('/reset-password'))).toBe(false)
})

test('email verification and resend use real endpoints and return to login without creating a session', async ({ page }) => {
  await authApi(page, { failPath: '/api/auth/login', status: 401, message: 'Please verify your email.' })
  await login(page)
  await page.getByRole('button', { name: 'Need to verify your email?' }).click()
  await expect(page).toHaveURL(/\/patient\/verify-email$/)
  await page.unroute('**/api/**')
  const requests = await authApi(page)
  await page.getByRole('button', { name: 'Resend code', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Your request was accepted.')
  for (let index = 0; index < 6; index++) await page.getByLabel(`Verification code digit ${index + 1}`).fill(String(index + 1))
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL(/\/patient\/login$/)
  expect(requests.map(request => [request.path, request.body])).toEqual([
    ['/api/auth/resend-email-otp', { email }],
    ['/api/auth/verify-email', { email, otp: '123456' }],
  ])
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPatientSession'))).toBeNull()
})

test('rejected profiles return to login and server errors offer retry without rendering the dashboard', async ({ page }) => {
  await authApi(page, { profileStatus: 403 })
  const rejectedProfile = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/profile')
  await login(page)
  await rejectedProfile
  await expect(page).toHaveURL(/\/patient\/login$/)
  await page.unroute('**/api/**')
  await authApi(page, { profileStatus: 503 })
  await login(page)
  await expect(page.getByRole('alert')).toContainText('Unable to check your session')
  await expect(page.getByRole('heading', { name: 'Welcome, Test patient' })).toHaveCount(0)
  await page.unroute('**/api/**')
  await authApi(page)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome, Test patient' })).toBeVisible()
})

test('session expiry removes access while the dashboard is open', async ({ page }) => {
  await authApi(page)
  await page.goto('/patient/login')
  await page.evaluate(token => sessionStorage.setItem('medtrailPatientSession', JSON.stringify({ token })), jwt('patient', Math.floor(Date.now() / 1000) + 3))
  await page.goto('/patient/dashboard')
  await expect(page.getByRole('heading', { name: 'Welcome, Test patient' })).toBeVisible()
  await expect(page).toHaveURL(/\/patient\/login$/, { timeout: 5000 })
  expect(await page.evaluate(() => sessionStorage.getItem('medtrailPatientSession'))).toBeNull()
})


for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 600 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 320, height: 568 }, { width: 320, height: 420 }]) {
  test(`Patient authentication is responsive at ${viewport.width}x${viewport.height}px throughout setup and recovery`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await authApi(page)
    async function checkLayout(formName) {
      const layoutViewport = page.viewportSize()
      const form = page.getByRole('form', { name: formName, exact: true })
      await expect(form).toBeVisible()
      const panel = page.locator('main > section:first-child')
      if (layoutViewport.width >= 1024) await expect(panel).toBeVisible()
      else await expect(panel).toBeHidden()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(layoutViewport.width)
      if (layoutViewport.width < 1024) {
        // Check element bounds: a clipped child can overflow even when the page hides it.
        const bounds = await form.evaluate(node => {
          const rect = node.getBoundingClientRect()
          return {
            left: rect.left, right: rect.right, width: rect.width,
            top: rect.top + window.scrollY,
            scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
            children: [...node.querySelectorAll('input, button, p')].map(child => {
              const box = child.getBoundingClientRect()
              return { left: box.left, right: box.right }
            }),
          }
        })
        expect(bounds.left).toBeGreaterThanOrEqual(16)
        expect(bounds.right).toBeLessThanOrEqual(layoutViewport.width - 16)
        expect(Math.abs(bounds.left - (layoutViewport.width - bounds.right))).toBeLessThanOrEqual(1)
        expect(bounds.width).toBeGreaterThanOrEqual(Math.min(400, layoutViewport.width - 64))
        expect(bounds.top).toBeLessThanOrEqual(48)
        expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.clientWidth + 1)
        for (const child of bounds.children) {
          expect(child.left).toBeGreaterThanOrEqual(bounds.left - 1)
          expect(child.right).toBeLessThanOrEqual(bounds.right + 1)
        }
        if (formName === 'Verify reset code form') {
          const gap = await form.evaluate(node => {
            const back = node.querySelector('button[type="button"]').getBoundingClientRect()
            const submit = node.querySelector('button[type="submit"]').getBoundingClientRect()
            return submit.top - back.bottom
          })
          expect(gap).toBeCloseTo(28, 0)
          expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(layoutViewport.height + 1)
        }
        if (formName === 'Reset password form') {
          const spacing = await form.evaluate(node => {
            const heading = node.querySelector('h2').getBoundingClientRect()
            const subtitle = node.querySelector('p').getBoundingClientRect()
            const label = node.querySelector('label').getBoundingClientRect()
            const input = node.querySelector('input').getBoundingClientRect()
            const back = node.querySelector('button[type="button"]').getBoundingClientRect()
            const submit = node.querySelector('button[type="submit"]').getBoundingClientRect()
            const form = node.getBoundingClientRect()
            return {
              gaps: [subtitle.top - heading.bottom, label.top - subtitle.bottom, input.top - label.bottom, back.top - input.bottom, submit.top - back.bottom],
              headingLeft: heading.left - form.left,
              headingAlignment: getComputedStyle(node.firstElementChild).textAlign,
              buttonWidths: [back.width, submit.width],
              formWidth: form.width,
            }
          })
          spacing.gaps.forEach((gap, index) => expect(gap).toBeCloseTo([16, 32, 8, 32, 28][index], 0))
          expect(spacing.headingLeft).toBeCloseTo(0, 0)
          expect(spacing.headingAlignment).toBe('left')
          spacing.buttonWidths.forEach(width => expect(width).toBeCloseTo(spacing.formWidth, 0))
        }
        if (formName === 'Login form') {
          const placement = await form.evaluate(node => {
            const fields = node.querySelector('.patient-login-fields')
            const contentTop = fields.firstElementChild.getBoundingClientRect().top
            const contentBottom = fields.querySelector('[type="submit"]').getBoundingClientRect().bottom
            const subtitle = fields.firstElementChild.querySelector('p').getBoundingClientRect()
            const heading = fields.firstElementChild.querySelector('h2').getBoundingClientRect()
            const emailLabel = node.querySelector('label[for="email"]').getBoundingClientRect()
            const emailInput = node.querySelector('#email').getBoundingClientRect()
            const passwordLabel = node.querySelector('label[for="password"]').getBoundingClientRect()
            const passwordInput = node.querySelector('#password').parentElement.getBoundingClientRect()
            const submit = fields.querySelector('[type="submit"]').getBoundingClientRect()
            const recovery = fields.querySelector('.patient-login-recovery button').getBoundingClientRect()
            const message = node.lastElementChild.getBoundingClientRect()
            const container = node.parentElement.getBoundingClientRect()
            return {
              contentTop: contentTop + window.scrollY,
              headingSubtitleGap: subtitle.top - heading.bottom,
              subtitleEmailGap: emailLabel.top - subtitle.bottom,
              emailPasswordGap: passwordLabel.top - emailInput.bottom,
              passwordRecoveryGap: recovery.top - passwordInput.bottom,
              recoveryContinueGap: submit.top - recovery.bottom,
              recoveryRightGap: node.getBoundingClientRect().right - recovery.right,
              gap: message.top - contentBottom,
              bottomPadding: container.bottom - message.bottom,
              containerBottom: container.bottom + window.scrollY,
              invitationLines: message.height / parseFloat(getComputedStyle(node.lastElementChild).lineHeight),
              pageHeight: document.documentElement.scrollHeight,
            }
          })
          expect(placement.contentTop).toBeGreaterThanOrEqual(70)
          expect(placement.contentTop).toBeLessThanOrEqual(90)
          for (const [actual, minimum, maximum] of [
            [placement.headingSubtitleGap, 15, 17],
            [placement.subtitleEmailGap, 41, 43],
            [placement.emailPasswordGap, 34, 36],
            [placement.passwordRecoveryGap, 16, 18],
            [placement.recoveryContinueGap, 45, 55],
          ]) {
            expect(actual).toBeGreaterThanOrEqual(minimum)
            expect(actual).toBeLessThanOrEqual(maximum)
          }
          expect(Math.abs(placement.recoveryRightGap)).toBeLessThanOrEqual(1)
          expect(placement.gap).toBeGreaterThanOrEqual(32)
          expect(placement.bottomPadding).toBeCloseTo(24, 0)
          expect(placement.containerBottom).toBeGreaterThanOrEqual(layoutViewport.height - 1)
          expect(placement.pageHeight).toBeCloseTo(Math.max(layoutViewport.height, placement.containerBottom), 0)
          if (layoutViewport.width >= 375) expect(placement.invitationLines).toBeCloseTo(2, 0)
          if (layoutViewport.height >= 667) expect(placement.pageHeight).toBeLessThanOrEqual(layoutViewport.height + 1)
        }
      }
      const button = form.getByRole('button', { name: 'Continue', exact: true })
      await button.scrollIntoViewIfNeeded()
      await expect(button).toBeInViewport()
    }
    await page.goto('/patient/create-password?token=responsive-invite')
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
    await checkLayout('Patient create password form')
    await page.goto('/patient/login')
    await checkLayout('Login form')
    await expect(page.getByText('Enter your email and password', { exact: true })).toBeVisible()
    await expect(page.getByText('Invited to MedTrail? Use the invitation link in your email to create your account.', { exact: true })).toBeVisible()
    if (viewport.width >= 375 && viewport.width <= 430) await page.screenshot({ path: testInfo.outputPath(`patient-login-${viewport.width}x${viewport.height}.png`), fullPage: true })
    if (viewport.width >= 375 && viewport.width <= 430) {
      // A reduced viewport with a focused field exercises the space available with a keyboard open.
      await page.getByLabel('Password', { exact: true }).focus()
      await page.setViewportSize({ width: viewport.width, height: 320 })
      await expect(page.getByLabel('Password', { exact: true })).toBeFocused()
      await checkLayout('Login form')
      await page.getByRole('button', { name: 'Continue', exact: true }).scrollIntoViewIfNeeded()
      await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeInViewport()
      const invitation = page.getByText('Invited to MedTrail? Use the invitation link in your email to create your account.', { exact: true })
      await invitation.scrollIntoViewIfNeeded()
      await expect(invitation).toBeInViewport()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
      await page.setViewportSize(viewport)
      await page.getByLabel('Password', { exact: true }).blur()
    }
    await page.getByRole('button', { name: 'Forgot password?' }).click()
    await expect(page).toHaveURL(/\/patient\/forgot-password$/)
    await checkLayout('Reset password form')
    if (viewport.width === 390) await page.screenshot({ path: testInfo.outputPath('patient-reset-password-mobile.png'), fullPage: true })
    await page.getByLabel('Email address', { exact: true }).fill(email)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page).toHaveURL(/\/patient\/verify-reset-code$/)
    await checkLayout('Verify reset code form')
    await resetCode(page)
    await expect(page).toHaveURL(/\/patient\/new-password$/)
    await checkLayout('New password form')
    await page.goto('/patient/verify-email')
    await checkLayout('Verify email form')
  })
}

for (const failPath of ['/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/complete-registration']) {
  test(`${failPath} failures never advance or claim completion`, async ({ page }) => {
    const requests = await authApi(page, { failPath, status: 503, message: 'Service unavailable.' })
    if (failPath.endsWith('complete-registration')) {
      await page.goto('/accept-invite?token=failed-registration')
      await expect(page).toHaveURL(/\/patient\/create-password\?/)
      await page.getByLabel('Password', { exact: true }).fill(password)
      await page.getByLabel('Confirm Password', { exact: true }).fill(password)
    } else {
      await page.goto('/patient/forgot-password')
      await page.getByLabel('Email address', { exact: true }).fill(email)
      if (failPath.endsWith('reset-password')) {
        await page.getByRole('button', { name: 'Continue', exact: true }).click()
        await resetCode(page)
        await page.getByLabel('Password', { exact: true }).fill(password)
        await page.getByLabel('Confirm password', { exact: true }).fill(password)
      }
    }
    const currentUrl = page.url()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(currentUrl)
    expect(requests.some(request => request.path === failPath)).toBe(true)
    expect(await page.evaluate(() => sessionStorage.getItem('medtrailPatientSession'))).toBeNull()
  })
}

test('a Patient role hint cannot authorize a Doctor invitation', async ({ page }) => {
  await authApi(page, { invitationRole: 'doctor' })
  await page.goto('/patient/create-password?token=doctor-invitation&role=patient')
  await expect(page.getByRole('alert')).toContainText('not for a Patient account')
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
})


test('Patient invitation errors keep Patient login navigation', async ({ page }) => {
  const requests = await authApi(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/accept-invite?role=patient&error=Invitation%20expired')
  await expect(page.locator('main > section:first-child')).toBeHidden()
  await expect(page.getByRole('link', { name: 'Return to Login', exact: true })).toHaveAttribute('href', '/patient/login')
  await page.getByRole('link', { name: 'Return to Login', exact: true }).click()
  await expect(page).toHaveURL(/\/patient\/login$/)
  expect(requests).toEqual([])
})

for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 600 }, { width: 1440, height: 900 }]) {
  test(`Patient desktop login follows the Doctor reference at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await authApi(page)
    async function desktopDesign() {
      return page.evaluate(() => {
        const selectors = ['main', 'main > section:first-child', 'main > section:last-child', 'main img', 'form', 'form h2', 'form h2 + p', 'label[for="email"]', '#email', 'label[for="password"]', '#password', 'button[type="submit"]']
        const properties = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color', 'backgroundColor', 'padding', 'borderRadius', 'borderColor', 'borderWidth', 'marginTop', 'marginBottom', 'width', 'maxWidth']
        const styles = selectors.map(selector => {
          const node = document.querySelector(selector)
          const css = getComputedStyle(node)
          return Object.fromEntries(properties.map(property => [property, css[property]]))
        })
        const panels = [...document.querySelectorAll('main > section')].map(node => {
          const rect = node.getBoundingClientRect()
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        })
        const form = document.querySelector('form')
        const formRect = form.getBoundingClientRect()
        const panelRect = form.parentElement.getBoundingClientRect()
        return {
          styles, panels,
          image: document.querySelector('main img').getAttribute('src'),
          headingBottomMargin: getComputedStyle(form.querySelector('h2').parentElement).marginBottom,
          centerOffset: Math.abs((formRect.top + formRect.bottom) / 2 - (panelRect.top + panelRect.bottom) / 2),
        }
      })
    }
    await page.goto('/doctor/login')
    await expect(page.getByRole('form', { name: 'Login form' })).toBeVisible()
    const reference = await desktopDesign()
    await page.goto('/patient/login')
    await expect(page.getByRole('form', { name: 'Login form' })).toBeVisible()
    const patient = await desktopDesign()
    expect(patient.styles).toEqual(reference.styles)
    expect(patient.panels).toEqual(reference.panels)
    expect(patient.image).toBe(reference.image)
    expect(patient.headingBottomMargin).toBe(reference.headingBottomMargin)
    expect(patient.centerOffset).toBeLessThanOrEqual(1)
    await expect(page.locator('main > section:first-child')).toBeVisible()
    await expect(page.getByText('Invited to MedTrail?', { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create one', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    await page.screenshot({ path: testInfo.outputPath(`patient-login-desktop-${viewport.width}x${viewport.height}.png`), fullPage: true })
  })
}
