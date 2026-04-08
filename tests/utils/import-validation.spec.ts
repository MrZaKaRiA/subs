import { expect, test } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid subscription that passes all field checks. */
function makeValidSub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-1',
    name: 'Netflix',
    price: 15.99,
    currency: 'USD',
    domain: 'https://netflix.com',
    billingCycle: 'monthly',
    ...overrides,
  }
}

/** Build an in-memory JSON file buffer for Playwright's setInputFiles. */
function jsonFile(data: unknown, name = 'import.json') {
  return {
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  }
}

/** Upload a JSON payload to the hidden file input and wait for it to settle. */
async function uploadJson(page: import('@playwright/test').Page, data: unknown) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(jsonFile(data))
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

test.describe('Import Validation Report', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Clear any persisted state so tests start from a known baseline
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    // Wait for the page to be ready (at least one card or the grid)
    await page.waitForSelector('main', { timeout: 15_000 })
  })

  // -------------------------------------------------------------------------
  // 1. Fully valid import — dialog must NOT appear; toast must confirm success
  // -------------------------------------------------------------------------
  test('fully valid JSON imports directly without showing the dialog', async ({ page }) => {
    const validData = [
      makeValidSub({ id: 'a1', name: 'Spotify', domain: 'https://spotify.com', price: 9.99 }),
      makeValidSub({ id: 'a2', name: 'Disney+', domain: 'https://disneyplus.com', price: 7.99 }),
    ]

    await uploadJson(page, validData)

    // Dialog must NOT appear
    await expect(page.getByRole('dialog', { name: /import validation report/i })).not.toBeVisible()

    // Success toast must appear
    await expect(page.getByText(/2 subscriptions imported successfully/i)).toBeVisible({ timeout: 5_000 })
  })

  // -------------------------------------------------------------------------
  // 2. Invalid JSON (parse error) — dialog opens with "File is not valid JSON"
  // -------------------------------------------------------------------------
  test('malformed JSON opens the dialog with a parse error message', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{ this is not json ]]]'),
    })

    const dialog = page.getByRole('dialog', { name: /import validation report/i })
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog).toContainText(/not valid json/i)
  })

  // -------------------------------------------------------------------------
  // 3. Partially valid JSON — dialog shows correct counts and allows partial import
  // -------------------------------------------------------------------------
  test('partially valid JSON shows the dialog with correct counts', async ({ page }) => {
    const mixed = [
      makeValidSub({ id: 'b1', name: 'Valid Sub', domain: 'https://valid.com' }),
      // Missing required "name"
      { id: 'b2', price: 10, currency: 'USD', domain: 'https://bad.com' },
      // price is negative
      makeValidSub({ id: 'b3', name: 'Bad Price', price: -5 }),
    ]

    await uploadJson(page, mixed)

    const dialog = page.getByRole('dialog', { name: /import validation report/i })
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Summary text: 1 valid, 2 invalid
    await expect(dialog).toContainText(/1 valid/i)
    await expect(dialog).toContainText(/2 invalid/i)
  })

  // -------------------------------------------------------------------------
  // 4. Field-level error messages are shown per row
  // -------------------------------------------------------------------------
  test('dialog shows per-row field errors for invalid rows', async ({ page }) => {
    const data = [
      // No name
      { id: 'c1', price: 5, currency: 'EUR', domain: 'https://x.com' },
      // Invalid billingCycle
      makeValidSub({ id: 'c2', name: 'Bad Cycle', billingCycle: 'bi-annual' }),
    ]

    await uploadJson(page, data)

    const dialog = page.getByRole('dialog', { name: /import validation report/i })
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Row 1: name error
    await expect(dialog).toContainText(/name is required/i)
    // Row 2: billing cycle error
    await expect(dialog).toContainText(/billingcycle must be one of/i)
  })

  // -------------------------------------------------------------------------
  // 5. Import button is disabled when ALL rows are invalid
  // -------------------------------------------------------------------------
  test('import button is disabled when every row is invalid', async ({ page }) => {
    const allInvalid = [
      // Both missing required fields
      { price: 10 },
      { name: '' },
    ]

    await uploadJson(page, allInvalid)

    const dialog = page.getByRole('dialog', { name: /import validation report/i })
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    const importBtn = dialog.getByRole('button', { name: /import/i })
    await expect(importBtn).toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // 6. Partial import: clicking "Import N valid rows" replaces subscriptions
  // -------------------------------------------------------------------------
  test('importing only valid rows from partial import replaces subscriptions', async ({ page }) => {
    const mixed = [
      makeValidSub({ id: 'd1', name: 'Kept Service', domain: 'https://kept.com', price: 12 }),
      // invalid row
      { id: 'd2', price: 'not-a-number', currency: 'USD', domain: 'https://bad.com' },
    ]

    await uploadJson(page, mixed)

    const dialog = page.getByRole('dialog', { name: /import validation report/i })
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Click the partial import button
    const importBtn = dialog.getByRole('button', { name: /import 1 valid row/i })
    await importBtn.click()

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 3_000 })

    // Success toast
    await expect(page.getByText(/1 subscription imported successfully/i)).toBeVisible({ timeout: 5_000 })

    // The valid subscription name should appear on the page
    await expect(page.getByText('Kept Service')).toBeVisible({ timeout: 5_000 })
  })

  // -------------------------------------------------------------------------
  // 7. Cancelling the dialog leaves subscriptions unchanged
  // -------------------------------------------------------------------------
  test('cancelling the dialog leaves subscriptions unchanged', async ({ page }) => {
    // Wait for any subscription cards to render before we count them
    await page.waitForSelector('[data-testid="subscription-card"]', { timeout: 15_000 })
    const cardsBefore = await page.locator('[data-testid="subscription-card"]').count()

    const allInvalid = [{ price: 'bad' }]
    await uploadJson(page, allInvalid)

    const dialog = page.getByRole('dialog', { name: /import validation report/i })
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    await dialog.getByRole('button', { name: /cancel/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 3_000 })

    // Card count must be identical to before
    const cardsAfter = await page.locator('[data-testid="subscription-card"]').count()
    expect(cardsAfter).toBe(cardsBefore)
  })

  // -------------------------------------------------------------------------
  // 8. Root value is not an array — dialog shows a clear error
  // -------------------------------------------------------------------------
  test('JSON object (not array) at root shows a clear error', async ({ page }) => {
    await uploadJson(page, { name: 'Not an array' })

    const dialog = page.getByRole('dialog', { name: /import validation report/i })
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog).toContainText(/must be a json array/i)
  })
})
