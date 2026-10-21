import { test, expect } from '@playwright/test'

for (const role of ['patient', 'doctor', 'pharmacist', 'admin', '']) {
  test(`shared invitation error styling is scoped correctly for ${role || 'unknown role'}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.route('**/api/**', route => route.abort())
    await page.goto(`/accept-invite?error=Invitation%20expired${role ? `&role=${role}` : ''}`)
    const illustrationPanel = page.locator('main > section').first()
    if (role === 'patient') await expect(illustrationPanel).toBeHidden()
    else await expect(illustrationPanel).toBeVisible()
    const computed = await page.locator('main > section').last().evaluate(element => {
      const style = getComputedStyle(element)
      return { minHeight: style.minHeight, overflowY: style.overflowY }
    })
    if (role === 'patient') expect(computed).toEqual({ minHeight: '667px', overflowY: 'auto' })
    else expect(computed).toEqual({ minHeight: 'auto', overflowY: 'visible' })
    await page.setViewportSize({ width: 1440, height: 929 })
    await expect(illustrationPanel).toBeVisible()
  })
}

// Error fixtures exercise navigation only; no authentication or account setup is performed.
for (const message of ['Invalid invitation link.', 'This invitation link has expired.']) {
  test(`Pharmacist invitation returns to Pharmacist login after ${message}`, async ({ page }) => {
    await page.route('**/api/auth/validate-invitation?*', route => route.fulfill({
      status: 400, contentType: 'application/json', body: JSON.stringify({ message }),
    }))
    await page.goto('/accept-invite?token=rejected-invitation&role=pharmacist')
    await expect(page.getByText(message, { exact: true })).toBeVisible()
    const link = page.getByRole('link', { name: 'Return to Login', exact: true })
    await expect(link).toHaveAttribute('href', '/pharmacist/login')
    await link.click()
    await expect(page).toHaveURL(/\/pharmacist\/login$/)
    await expect(page.getByRole('form', { name: 'Login form' })).toBeVisible()
  })
}

test('Pharmacist invitation with an error redirect preserves its login destination without API calls', async ({ page }) => {
  const apiRequests = []
  page.on('request', request => {
    if (request.url().includes('/api/')) apiRequests.push(request.url())
  })
  await page.goto('/accept-invite?role=pharmacist&error=Invitation%20expired')
  await expect(page.getByRole('link', { name: 'Return to Login', exact: true })).toHaveAttribute('href', '/pharmacist/login')
  expect(apiRequests).toEqual([])
})

for (const query of ['role=doctor&error=Invitation%20expired']) {
  test(`existing Doctor error navigation is preserved for ${query}`, async ({ page }) => {
    await page.goto(`/accept-invite?${query}`)
    const link = page.getByRole('link', { name: 'Return to Login', exact: true })
    await expect(link).toHaveAttribute('href', '/doctor/login')
    await link.click()
    await expect(page).toHaveURL(/\/doctor\/login$/)
  })
}

for (const message of ['Invalid invitation link.', 'This invitation link has expired.']) {
  for (const role of ['doctor', 'pharmacist']) {
    test(`token-only ${message} offers both logins and opens ${role} login`, async ({ page }) => {
      await page.route('**/api/auth/validate-invitation?*', route => route.fulfill({
        status: 400, contentType: 'application/json', body: JSON.stringify({ message }),
      }))
      await page.goto('/accept-invite?token=rejected-invitation')
      await expect(page.getByText(message, { exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Doctor Login', exact: true })).toHaveAttribute('href', '/doctor/login')
      await expect(page.getByRole('link', { name: 'Pharmacist Login', exact: true })).toHaveAttribute('href', '/pharmacist/login')
      await expect(page.getByRole('link', { name: 'Return to Login', exact: true })).toHaveCount(0)
      await page.getByRole('link', { name: role === 'doctor' ? 'Doctor Login' : 'Pharmacist Login', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`/${role}/login$`))
      await expect(page.getByRole('form', { name: 'Login form' })).toBeVisible()
    })
  }
}

for (const query of ['error=Invitation%20expired', 'role=unsupported&error=Invitation%20expired']) {
  test(`unknown-role error redirect offers both logins on mobile for ${query}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const requests = []
    page.on('request', request => {
      if (request.url().includes('/api/')) requests.push(request.url())
    })
    await page.goto(`/accept-invite?${query}`)
    await expect(page.getByRole('link', { name: 'Doctor Login', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pharmacist Login', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    expect(requests).toEqual([])
  })
}
