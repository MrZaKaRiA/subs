import { expect, test } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CARD = '[data-testid="subscription-card"]'

async function freshPage(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('main', { timeout: 15_000 })
}

async function importSubscriptions(page: import('@playwright/test').Page, data: unknown) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({
    name: 'import.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Category Field', () => {
  test.beforeEach(async ({ page }) => {
    await freshPage(page)
  })

  // ── Category chip on card ──────────────────────────────────────────────────

  test('category badge is shown on the subscription card when category is set', async ({ page }) => {
    await importSubscriptions(page, [
      { id: 'c1', name: 'Streaming Service', price: 15.99, currency: 'USD', domain: 'https://stream.com', category: 'Streaming' },
    ])
    await page.waitForSelector(CARD, { timeout: 5_000 })

    const card = page.locator(CARD).filter({ hasText: 'Streaming Service' })
    await expect(card.getByText('Streaming')).toBeVisible()
  })

  test('no category badge when category is not set', async ({ page }) => {
    await importSubscriptions(page, [
      { id: 'c2', name: 'No Category Sub', price: 5, currency: 'USD', domain: 'https://nocat.com' },
    ])
    await page.waitForSelector(CARD, { timeout: 5_000 })

    // Only the card text "No Category Sub" should appear; "Streaming", "Music", etc. should not
    const card = page.locator(CARD).filter({ hasText: 'No Category Sub' })
    // Check there's no badge with a known category value
    await expect(card.getByText('Streaming')).not.toBeVisible()
    await expect(card.getByText('Music')).not.toBeVisible()
  })

  // ── Category filter dropdown ────────────────────────────────────────────────

  test('category filter shows only subscriptions matching the selected category', async ({ page }) => {
    await importSubscriptions(page, [
      { id: 'f1', name: 'Netflix', price: 15.99, currency: 'USD', domain: 'https://netflix.com', category: 'Streaming' },
      { id: 'f2', name: 'Spotify', price: 9.99, currency: 'USD', domain: 'https://spotify.com', category: 'Music' },
      { id: 'f3', name: 'ChatGPT', price: 20, currency: 'USD', domain: 'https://openai.com', category: 'AI Tools' },
    ])
    await page.waitForSelector(CARD, { timeout: 5_000 })

    // All 3 cards visible initially
    await expect(page.locator(CARD)).toHaveCount(3)

    // Select "Music" from the category filter
    const categorySelect = page.getByRole('combobox').filter({ hasText: /all categories/i })
    await categorySelect.click()
    await page.getByRole('option', { name: 'Music' }).click()

    // Only the Spotify card should be visible
    await expect(page.locator(CARD)).toHaveCount(1)
    await expect(page.locator(CARD).filter({ hasText: 'Spotify' })).toBeVisible()
    await expect(page.locator(CARD).filter({ hasText: 'Netflix' })).not.toBeVisible()
  })

  test('active category filter badge is shown and reset button clears it', async ({ page }) => {
    await importSubscriptions(page, [
      { id: 'g1', name: 'Service A', price: 10, currency: 'USD', domain: 'https://a.com', category: 'Cloud' },
      { id: 'g2', name: 'Service B', price: 10, currency: 'USD', domain: 'https://b.com', category: 'Gaming' },
    ])
    await page.waitForSelector(CARD, { timeout: 5_000 })

    const categorySelect = page.getByRole('combobox').filter({ hasText: /all categories/i })
    await categorySelect.click()
    await page.getByRole('option', { name: 'Cloud' }).click()

    // Active filter badge should be visible
    await expect(page.getByText('Category: Cloud')).toBeVisible()

    // Reset view button should clear the filter
    await page.getByRole('button', { name: /reset view/i }).click()
    await expect(page.locator(CARD)).toHaveCount(2)
    await expect(page.getByText('Category: Cloud')).not.toBeVisible()
  })

  test('"All categories" option restores the full list', async ({ page }) => {
    await importSubscriptions(page, [
      { id: 'a1', name: 'Music Sub', price: 9.99, currency: 'USD', domain: 'https://music.com', category: 'Music' },
      { id: 'a2', name: 'Cloud Sub', price: 5, currency: 'USD', domain: 'https://cloud.com', category: 'Cloud' },
    ])
    await page.waitForSelector(CARD, { timeout: 5_000 })

    // Filter to Music first
    const categorySelect = page.getByRole('combobox').filter({ hasText: /all categories/i })
    await categorySelect.click()
    await page.getByRole('option', { name: 'Music' }).click()
    await expect(page.locator(CARD)).toHaveCount(1)

    // Switch back to All categories
    await page.getByRole('combobox').filter({ hasText: 'Music' }).click()
    await page.getByRole('option', { name: 'All categories' }).click()
    await expect(page.locator(CARD)).toHaveCount(2)
  })

  // ── Category in AddSubscriptionPopover ─────────────────────────────────────

  test('category selected in Add Subscription popover appears as badge on the new card', async ({ page }) => {
    // Open the Add Subscription popover via the button in the header
    await page.getByRole('button', { name: /add subscription/i }).click()

    // Wait for popover form
    await page.waitForSelector('#name', { timeout: 5_000 })

    // Fill required fields
    await page.fill('#name', 'My Productivity App')
    await page.fill('input[type="number"]', '12')
    await page.fill('#domain', 'https://productivity.com')

    // Select a category
    const catSelect = page.getByRole('combobox').filter({ hasText: /select category/i })
    await catSelect.click()
    await page.getByRole('option', { name: 'Productivity' }).click()

    // Submit
    await page.getByRole('button', { name: 'Save' }).click()

    // Card should appear with the Productivity badge
    await page.waitForSelector(CARD, { timeout: 5_000 })
    const newCard = page.locator(CARD).filter({ hasText: 'My Productivity App' })
    await expect(newCard.getByText('Productivity')).toBeVisible()
  })

  // ── Category from Quick Add Template (Feature 1 link) ─────────────────────

  test('quick-add template pre-fills category in the Edit modal', async ({ page }) => {
    // Clear all subscriptions so the empty state with templates appears
    await page.evaluate(() => {
      localStorage.clear()
    })
    // Force an empty subscription list via a clean import
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'empty.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify([])),
    })

    // The grid should now show the empty state with template chips
    await page.waitForSelector('text=No subscriptions yet', { timeout: 5_000 })

    // Click the Netflix template chip
    await page.getByRole('button', { name: 'Netflix' }).click()

    // The Edit modal should open with category pre-filled to "Streaming"
    await page.waitForSelector('text=Add Subscription', { timeout: 5_000 })

    // The category select should already say "Streaming"
    const categoryCombobox = page.locator('#category')
    await expect(categoryCombobox).toContainText('Streaming')
  })
})
