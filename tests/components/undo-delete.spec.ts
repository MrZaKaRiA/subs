import { expect, test } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Intercept the storage API so tests run in full isolation:
 *  - GET returns a predictable set of default subscriptions.
 *  - PUT / DELETE are swallowed (no disk writes during tests).
 */
async function mockStorage(
  page: import('@playwright/test').Page,
  subscriptions = DEFAULT_SUBS,
) {
  await page.route('/api/storage/subscription-storage', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          value: {
            state: { subscriptions },
            version: 0,
          },
        }),
      })
    } else {
      // Accept writes without persisting to disk
      await route.fulfill({ status: 200, body: '{}' })
    }
  })
}

const DEFAULT_SUBS = [
  { id: '1', name: 'Netflix', price: 15.99, currency: 'USD', domain: 'https://netflix.com' },
  { id: '2', name: 'Spotify', price: 9.99, currency: 'USD', domain: 'https://spotify.com' },
]

const CARD = '[data-testid="subscription-card"]'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Undo Delete (Feature 5)', () => {
  test.beforeEach(async ({ page }) => {
    await mockStorage(page)
    await page.goto('/')
    await page.waitForSelector(CARD, { timeout: 15_000 })
  })

  // -------------------------------------------------------------------------
  // 1. Deleting removes the card immediately — no confirm dialog
  // -------------------------------------------------------------------------
  test('card is removed from the grid immediately on delete', async ({ page }) => {
    // Hover over the Netflix card to reveal the delete button
    const netflixCard = page.locator(CARD).filter({ hasText: 'Netflix' })
    await netflixCard.hover()

    const deleteBtn = netflixCard.getByRole('button', { name: /delete/i })
    await deleteBtn.click()

    // Card must be gone right away — no confirmation dialog should appear
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(netflixCard).not.toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 2. An "Undo" action appears in the toast
  // -------------------------------------------------------------------------
  test('a toast with an Undo button appears after deleting', async ({ page }) => {
    const netflixCard = page.locator(CARD).filter({ hasText: 'Netflix' })
    await netflixCard.hover()
    await netflixCard.getByRole('button', { name: /delete/i }).click()

    // Sonner renders toasts outside the main landmark; look for the Undo button text
    await expect(page.getByRole('button', { name: /undo/i })).toBeVisible({ timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // 3. Clicking Undo restores the card
  // -------------------------------------------------------------------------
  test('clicking Undo restores the deleted subscription', async ({ page }) => {
    const netflixCard = page.locator(CARD).filter({ hasText: 'Netflix' })
    await netflixCard.hover()
    await netflixCard.getByRole('button', { name: /delete/i }).click()

    // Wait for the Undo button to be visible, then click it
    const undoBtn = page.getByRole('button', { name: /undo/i })
    await expect(undoBtn).toBeVisible({ timeout: 3_000 })
    await undoBtn.click()

    // Netflix card must be back in the grid
    await expect(page.locator(CARD).filter({ hasText: 'Netflix' })).toBeVisible({ timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // 4. Card count is correct after Undo (no duplication)
  // -------------------------------------------------------------------------
  test('card count remains the same after delete + undo', async ({ page }) => {
    const countBefore = await page.locator(CARD).count()

    const netflixCard = page.locator(CARD).filter({ hasText: 'Netflix' })
    await netflixCard.hover()
    await netflixCard.getByRole('button', { name: /delete/i }).click()

    const undoBtn = page.getByRole('button', { name: /undo/i })
    await expect(undoBtn).toBeVisible({ timeout: 3_000 })
    await undoBtn.click()

    await expect(page.locator(CARD).filter({ hasText: 'Netflix' })).toBeVisible({ timeout: 3_000 })
    const countAfter = await page.locator(CARD).count()
    expect(countAfter).toBe(countBefore)
  })

  // -------------------------------------------------------------------------
  // 5. After the 5-second window the Undo button disappears (toast auto-closes)
  // -------------------------------------------------------------------------
  test('Undo toast disappears after 5 seconds and card stays gone', async ({ page }) => {
    // Install fake clock before page load so setTimeout is controlled
    await page.clock.install()
    // Re-mock storage after installing the clock (clock resets the page context)
    await mockStorage(page)
    await page.goto('/')
    await page.waitForSelector(CARD, { timeout: 15_000 })

    const netflixCard = page.locator(CARD).filter({ hasText: 'Netflix' })
    await netflixCard.hover()
    await netflixCard.getByRole('button', { name: /delete/i }).click()

    // Confirm toast is visible
    await expect(page.getByRole('button', { name: /undo/i })).toBeVisible({ timeout: 3_000 })

    // Advance time past the 5-second undo window
    await page.clock.fastForward(6_000)

    // Undo button must be gone
    await expect(page.getByRole('button', { name: /undo/i })).not.toBeVisible({ timeout: 3_000 })

    // Netflix must still be absent
    await expect(page.locator(CARD).filter({ hasText: 'Netflix' })).not.toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 6. Deleting a second card before Undo flushes the first deletion
  // -------------------------------------------------------------------------
  test('deleting a second card before undoing flushes the first deletion', async ({ page }) => {
    const netflixCard = page.locator(CARD).filter({ hasText: 'Netflix' })
    await netflixCard.hover()
    await netflixCard.getByRole('button', { name: /delete/i }).click()

    // Immediately delete the second card (Spotify) without clicking Undo
    const spotifyCard = page.locator(CARD).filter({ hasText: 'Spotify' })
    await spotifyCard.hover()
    await spotifyCard.getByRole('button', { name: /delete/i }).click()

    // Only one Undo button should be visible (for Spotify)
    await expect(page.getByRole('button', { name: /undo/i })).toHaveCount(1, { timeout: 3_000 })

    // Undo Spotify
    await page.getByRole('button', { name: /undo/i }).click()

    // Spotify comes back, Netflix stays gone
    await expect(page.locator(CARD).filter({ hasText: 'Spotify' })).toBeVisible({ timeout: 3_000 })
    await expect(page.locator(CARD).filter({ hasText: 'Netflix' })).not.toBeVisible()
  })
})
