import { test, expect } from '@playwright/test'

test('New Password design preview needs no recovery state and cannot call an API or change sessions', async ({ page }) => {
  const requests = []
  await page.route('**/api/**', async route => {
    requests.push(route.request().url())
    await route.abort()
  })
  await page.goto('/pharmacist/preview/new-password')
  await expect(page.getByRole('heading', { name: 'New password', exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Password changes are disabled')
  const storage = await page.evaluate(() => [JSON.stringify(sessionStorage), JSON.stringify(localStorage)])
  await page.getByLabel('Password', { exact: true }).fill('VisualOnly!123')
  await page.getByLabel('Confirm password', { exact: true }).fill('VisualOnly!123')
  await page.getByRole('button', { name: 'Show password', exact: true }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Go back', exact: true })).toBeDisabled()
  await page.getByRole('form', { name: 'New password form' }).dispatchEvent('submit')
  await expect(page).toHaveURL(/\/pharmacist\/preview\/new-password$/)
  expect(requests).toEqual([])
  const currentStorage = await page.evaluate(() => [JSON.stringify(sessionStorage), JSON.stringify(localStorage)])
  expect(currentStorage).toEqual(storage)
  await page.goto('/pharmacist/new-password')
  await expect(page).toHaveURL(/\/pharmacist\/forgot-password$/)
})
