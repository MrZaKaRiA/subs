import { type Page, expect, test } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset localStorage and reload the page to a clean state. */
async function resetPage(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('main', { timeout: 15_000 })
}

/** Open the "Add Subscription" popover in the header. */
async function openAddPopover(page: Page) {
  await page.getByRole('button', { name: /add subscription/i }).first().click()
  await expect(page.getByText('Add Subscription').nth(1)).toBeVisible()
}

/** Build an in-memory JSON file buffer for Playwright's setInputFiles. */
function jsonFile(data: unknown, name = 'import.json') {
  return {
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  }
}

/** Minimal valid subscription for import tests. */
function makeValidSub(overrides: Record<string, unknown> = {}) {
  return {
    id: `test-${Math.random().toString(36).slice(2)}`,
    name: 'Netflix',
    price: 15.99,
    currency: 'USD',
    domain: 'https://netflix.com',
    billingCycle: 'monthly',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Feature 1 — Empty State with Quick Add Templates
// ---------------------------------------------------------------------------

test.describe('Feature 1 — Empty State with Quick Add Templates', () => {
  test.beforeEach(async ({ page }) => {
    await resetPage(page)
  })

  test('shows template chips when list is empty', async ({ page }) => {
    await expect(page.getByText('No subscriptions yet')).toBeVisible()
    // All 6 template labels should be visible
    for (const label of ['Netflix', 'Spotify', 'ChatGPT Plus', 'Google One', 'GitHub Copilot', 'Adobe CC']) {
      await expect(page.getByRole('button', { name: label })).toBeVisible()
    }
    await expect(page.getByRole('button', { name: /start from scratch/i })).toBeVisible()
  })

  test('clicking a template chip opens modal with template data pre-filled', async ({ page }) => {
    await page.getByRole('button', { name: 'Netflix' }).click()

    // Modal should be open
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Name field should be pre-filled with "Netflix"
    await expect(dialog.locator('input#name')).toHaveValue('Netflix')

    // Price field should be pre-filled
    const priceInput = dialog.locator('input#price')
    const priceVal = await priceInput.inputValue()
    expect(Number(priceVal)).toBeGreaterThan(0)

    // Domain should be pre-filled
    const domainInput = dialog.locator('input#domain')
    await expect(domainInput).not.toHaveValue('')
  })

  test('clicking "Start from scratch" opens an empty modal', async ({ page }) => {
    await page.getByRole('button', { name: /start from scratch/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Name field should be empty
    await expect(dialog.locator('input#name')).toHaveValue('')
  })

  test('template chips are hidden once subscriptions exist', async ({ page }) => {
    // Import one subscription so the list is no longer empty
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(jsonFile([makeValidSub()]))
    // Wait for the import to settle (either toast or card appears)
    await page.waitForTimeout(1_000)

    // Template chips should not be visible anymore
    await expect(page.getByRole('button', { name: 'Netflix' }).first()).not.toBeVisible()
    await expect(page.getByText(/start from scratch/i)).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Feature 2 — Inline Currency Symbol Preview
// ---------------------------------------------------------------------------

test.describe('Feature 2 — Inline Currency Symbol Preview (EditSubscriptionModal)', () => {
  test.beforeEach(async ({ page }) => {
    await resetPage(page)
    // Open the modal via "Start from scratch"
    await page.getByRole('button', { name: /start from scratch/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('shows "$" symbol next to price input for USD', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    // The absolute-positioned currency symbol span sits inside the relative container
    await expect(dialog.locator('span.absolute').filter({ hasText: '$' })).toBeVisible()
  })

  test('currency symbol updates when currency changes', async ({ page }) => {
    const dialog = page.getByRole('dialog')

    // Change currency to EUR via the currency select
    await dialog.locator('button#currency').click()
    await page.getByRole('option', { name: 'EUR' }).click()

    // Symbol should now show "€"
    await expect(dialog.locator('span.absolute').filter({ hasText: '€' })).toBeVisible()
  })

  test('conversion hint appears when price is entered with non-summary currency', async ({ page }) => {
    const dialog = page.getByRole('dialog')

    // Change currency to EUR
    await dialog.locator('button#currency').click()
    await page.getByRole('option', { name: 'EUR' }).click()

    // Enter a price
    await dialog.locator('input#price').fill('10')

    // Conversion hint should appear (shows ≈ amount in summary currency)
    await expect(dialog.locator('p').filter({ hasText: '≈' })).toBeVisible()
  })

  test('conversion hint is hidden when currency matches summary currency', async ({ page }) => {
    const dialog = page.getByRole('dialog')

    // Default currency should be USD which matches the summary currency default
    await dialog.locator('input#price').fill('10')

    // Conversion hint should NOT appear when currencies match
    await expect(dialog.locator('p').filter({ hasText: '≈' })).not.toBeVisible()
  })
})

test.describe('Feature 2 — Inline Currency Symbol Preview (AddSubscriptionPopover)', () => {
  test.beforeEach(async ({ page }) => {
    await resetPage(page)
    await openAddPopover(page)
  })

  test('shows "$" symbol next to price input for USD', async ({ page }) => {
    const popover = page.locator('[data-radix-popper-content-wrapper]')
    await expect(popover.locator('span.absolute').filter({ hasText: '$' })).toBeVisible()
  })

  test('currency symbol updates when currency changes', async ({ page }) => {
    const popover = page.locator('[data-radix-popper-content-wrapper]')

    await popover.locator('button#currency').click()
    await page.getByRole('option', { name: 'EUR' }).click()

    await expect(popover.locator('span.absolute').filter({ hasText: '€' })).toBeVisible()
  })

  test('conversion hint appears when price is entered with non-summary currency', async ({ page }) => {
    const popover = page.locator('[data-radix-popper-content-wrapper]')

    await popover.locator('button#currency').click()
    await page.getByRole('option', { name: 'EUR' }).click()

    await popover.locator('input#price').fill('10')

    await expect(popover.locator('p').filter({ hasText: '≈' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Feature 3 — "Last Imported" Metadata
// ---------------------------------------------------------------------------

test.describe('Feature 3 — Last Imported Metadata', () => {
  test.beforeEach(async ({ page }) => {
    await resetPage(page)
  })

  test('import button has no green dot before any import', async ({ page }) => {
    const importBtn = page.getByTestId('import-button')
    await expect(importBtn).toBeVisible()
    // Green dot is a span with bg-green-500 inside the button
    await expect(importBtn.locator('span.bg-green-500')).not.toBeVisible()
  })

  test('green dot appears on import button after a successful import', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(jsonFile([makeValidSub()]))

    // Wait for the import to complete
    await page.waitForTimeout(1_500)

    const importBtn = page.getByTestId('import-button')
    await expect(importBtn.locator('span.bg-green-500')).toBeVisible()
  })

  test('import button tooltip shows formatted date after import', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(jsonFile([makeValidSub()]))
    await page.waitForTimeout(1_500)

    // Hover over the import button to reveal the tooltip
    const importBtn = page.getByTestId('import-button')
    await importBtn.hover()

    // Tooltip should contain "Last imported:" text
    await expect(page.getByText(/last imported:/i)).toBeVisible({ timeout: 5_000 })
  })

  test('last import date persists across page reloads', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(jsonFile([makeValidSub()]))
    await page.waitForTimeout(1_500)

    // Reload the page — state is persisted in localStorage
    await page.reload()
    await page.waitForSelector('main', { timeout: 15_000 })

    const importBtn = page.getByTestId('import-button')
    await expect(importBtn.locator('span.bg-green-500')).toBeVisible()
  })
})
