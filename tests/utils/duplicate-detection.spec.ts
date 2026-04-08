import { expect, test } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid subscription used throughout these tests. */
function makeSub(overrides: Record<string, unknown> = {}) {
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

/**
 * Intercept the storage API so each test runs in full isolation.
 */
async function mockStorage(
  page: import('@playwright/test').Page,
  subscriptions: unknown[] = EXISTING_SUBS,
) {
  await page.route('/api/storage/subscription-storage', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          value: { state: { subscriptions }, version: 0 },
        }),
      })
    } else {
      await route.fulfill({ status: 200, body: '{}' })
    }
  })
}

/** Upload a JSON payload to the hidden file input. */
async function uploadJson(page: import('@playwright/test').Page, data: unknown) {
  await page.locator('input[type="file"]').setInputFiles(jsonFile(data))
}

// One existing subscription that tests can try to duplicate
const EXISTING_SUBS = [
  {
    id: 'existing-1',
    name: 'Netflix',
    price: 15.99,
    currency: 'USD',
    domain: 'https://netflix.com',
    billingCycle: 'monthly',
  },
]

const CARD = '[data-testid="subscription-card"]'
const DUPE_DIALOG = /duplicate subscriptions detected/i

// ---------------------------------------------------------------------------
// Import flow tests
// ---------------------------------------------------------------------------

test.describe('Duplicate Detection — Import flow (Feature 7)', () => {
  test.beforeEach(async ({ page }) => {
    await mockStorage(page)
    await page.goto('/')
    await page.waitForSelector(CARD, { timeout: 15_000 })
  })

  // -------------------------------------------------------------------------
  // 1. Importing a file with no duplicates skips the dialog entirely
  // -------------------------------------------------------------------------
  test('clean import (no duplicates) imports without showing the dialog', async ({ page }) => {
    const fresh = [makeSub({ id: 'new-1', name: 'Spotify', domain: 'https://spotify.com', price: 9.99 })]
    await uploadJson(page, fresh)

    await expect(page.getByRole('dialog', { name: DUPE_DIALOG })).not.toBeVisible({ timeout: 3_000 })
    await expect(page.getByText(/imported successfully/i)).toBeVisible({ timeout: 5_000 })
  })

  // -------------------------------------------------------------------------
  // 2. Importing a file that contains an existing entry opens the dialog
  // -------------------------------------------------------------------------
  test('importing a duplicate subscription opens the duplicate dialog', async ({ page }) => {
    // Same domain + price + currency as the existing Netflix entry
    const withDupe = [makeSub({ id: 'dupe-1' })]
    await uploadJson(page, withDupe)

    const dialog = page.getByRole('dialog', { name: DUPE_DIALOG })
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog).toContainText('Netflix')
  })

  // -------------------------------------------------------------------------
  // 3. "Skip duplicates" imports only the non-duplicate rows
  // -------------------------------------------------------------------------
  test('Skip duplicates imports only new entries', async ({ page }) => {
    const incoming = [
      makeSub({ id: 'dupe-1' }), // duplicate of existing Netflix
      makeSub({ id: 'new-2', name: 'Spotify', domain: 'https://spotify.com', price: 9.99 }),
    ]
    await uploadJson(page, incoming)

    const dialog = page.getByRole('dialog', { name: DUPE_DIALOG })
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    await dialog.getByRole('button', { name: /skip duplicates/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 3_000 })

    await expect(page.getByText(/skipped 1 duplicate/i)).toBeVisible({ timeout: 5_000 })
  })

  // -------------------------------------------------------------------------
  // 4. "Keep both" adds all incoming entries, including the duplicate
  // -------------------------------------------------------------------------
  test('Keep both adds all incoming entries alongside the existing ones', async ({ page }) => {
    const incoming = [makeSub({ id: 'dupe-1' })] // duplicate
    await uploadJson(page, incoming)

    const dialog = page.getByRole('dialog', { name: DUPE_DIALOG })
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    await dialog.getByRole('button', { name: /keep both/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 3_000 })

    await expect(page.getByText(/kept both/i)).toBeVisible({ timeout: 5_000 })
  })

  // -------------------------------------------------------------------------
  // 5. "Replace existing" removes the old entry and keeps the incoming one
  // -------------------------------------------------------------------------
  test('Replace existing removes the matched entry and imports the new one', async ({ page }) => {
    const incoming = [makeSub({ id: 'dupe-1', name: 'Netflix Updated' })]
    await uploadJson(page, incoming)

    const dialog = page.getByRole('dialog', { name: DUPE_DIALOG })
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    await dialog.getByRole('button', { name: /replace existing/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 3_000 })

    await expect(page.getByText(/replaced 1 duplicate/i)).toBeVisible({ timeout: 5_000 })
  })

  // -------------------------------------------------------------------------
  // 6. Closing the dialog (Escape) leaves subscriptions unchanged
  // -------------------------------------------------------------------------
  test('closing the duplicate dialog leaves the existing subscriptions intact', async ({ page }) => {
    const countBefore = await page.locator(CARD).count()

    const incoming = [makeSub({ id: 'dupe-1' })]
    await uploadJson(page, incoming)

    const dialog = page.getByRole('dialog', { name: DUPE_DIALOG })
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible({ timeout: 3_000 })

    const countAfter = await page.locator(CARD).count()
    expect(countAfter).toBe(countBefore)
  })

  // -------------------------------------------------------------------------
  // 7. All three resolution buttons are rendered in the dialog
  // -------------------------------------------------------------------------
  test('the duplicate dialog renders all three resolution actions', async ({ page }) => {
    await uploadJson(page, [makeSub({ id: 'dupe-1' })])

    const dialog = page.getByRole('dialog', { name: DUPE_DIALOG })
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    await expect(dialog.getByRole('button', { name: /skip duplicates/i })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /keep both/i })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /replace existing/i })).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 8. Domain variants are treated as the same fingerprint
  //    (http vs https, www prefix, trailing slash, path segments)
  // -------------------------------------------------------------------------
  test.describe('fingerprint normalisation', () => {
    const variants = [
      { label: 'http instead of https', domain: 'http://netflix.com' },
      { label: 'www prefix', domain: 'https://www.netflix.com' },
      { label: 'trailing slash', domain: 'https://netflix.com/' },
      { label: 'sub-path', domain: 'https://netflix.com/browse' },
    ]

    for (const { label, domain } of variants) {
      test(`duplicate detected for domain variant: ${label}`, async ({ page }) => {
        const incoming = [makeSub({ id: 'dupe-1', domain })]
        await uploadJson(page, incoming)

        await expect(page.getByRole('dialog', { name: DUPE_DIALOG })).toBeVisible({ timeout: 5_000 })
      })
    }
  })
})

// ---------------------------------------------------------------------------
// Save-form duplicate warning tests
// ---------------------------------------------------------------------------

test.describe('Duplicate Detection — Save form (Feature 7)', () => {
  test.beforeEach(async ({ page }) => {
    await mockStorage(page, EXISTING_SUBS)
    await page.goto('/')
    await page.waitForSelector(CARD, { timeout: 15_000 })
  })

  // -------------------------------------------------------------------------
  // 9. Saving a subscription with the same fingerprint triggers window.confirm
  // -------------------------------------------------------------------------
  test('saving a duplicate subscription triggers a browser confirm dialog', async ({ page }) => {
    let confirmMessage: string | null = null
    page.on('dialog', async (dialog) => {
      confirmMessage = dialog.message()
      await dialog.dismiss() // cancel — we just want to inspect the message
    })

    // Open the Add Subscription popover via keyboard shortcut
    await page.keyboard.press('n')
    const nameInput = page.getByLabel(/name/i).first()
    await expect(nameInput).toBeVisible({ timeout: 5_000 })

    // Fill with the same fingerprint as the existing Netflix entry
    await nameInput.fill('Netflix Duplicate')
    await page.getByLabel(/price/i).first().fill('15.99')
    await page.getByLabel(/url|domain|website/i).first().fill('https://netflix.com')

    // Submit
    await page.getByRole('button', { name: /add|save/i }).first().click()

    await expect.poll(() => confirmMessage, { timeout: 5_000 }).not.toBeNull()
    expect(confirmMessage).toMatch(/already exists/i)
  })

  // -------------------------------------------------------------------------
  // 10. Dismissing the confirm keeps the form open without adding the duplicate
  // -------------------------------------------------------------------------
  test('dismissing the confirm dialog keeps the existing subscription count', async ({ page }) => {
    const countBefore = await page.locator(CARD).count()

    page.on('dialog', async (dialog) => dialog.dismiss())

    await page.keyboard.press('n')
    const nameInput = page.getByLabel(/name/i).first()
    await expect(nameInput).toBeVisible({ timeout: 5_000 })

    await nameInput.fill('Netflix Duplicate')
    await page.getByLabel(/price/i).first().fill('15.99')
    await page.getByLabel(/url|domain|website/i).first().fill('https://netflix.com')
    await page.getByRole('button', { name: /add|save/i }).first().click()

    // Wait for any dialogs to resolve
    await page.waitForTimeout(500)

    const countAfter = await page.locator(CARD).count()
    expect(countAfter).toBe(countBefore)
  })
})
