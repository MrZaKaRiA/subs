import { expect, test } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
      await route.fulfill({ status: 200, body: '{}' })
    }
  })
}

const DEFAULT_SUBS = [
  { id: '1', name: 'Netflix', price: 15.99, currency: 'USD', domain: 'https://netflix.com', billingCycle: 'monthly' },
  { id: '2', name: 'Spotify', price: 9.99, currency: 'USD', domain: 'https://spotify.com', billingCycle: 'yearly' },
]

// ---------------------------------------------------------------------------
// Feature 4 — Keyboard Shortcut Improvements
// ---------------------------------------------------------------------------

test.describe('Feature 4 — Keyboard Shortcut Improvements', () => {
  test.beforeEach(async ({ page }) => {
    await mockStorage(page)
    await page.goto('/')
    await page.waitForSelector('main', { timeout: 15_000 })
  })

  // -------------------------------------------------------------------------
  // C key cycles the category filter
  // -------------------------------------------------------------------------
  test('pressing C cycles the category filter forward', async ({ page }) => {
    // Confirm filter starts at "all categories"
    const categorySelect = page.locator('[data-testid]').filter({ hasText: /all categories/i }).first()

    // The displayed badge should initially show no category filter applied
    await expect(page.getByRole('button', { name: /reset view/i })).not.toBeVisible()

    // Press C to advance the category filter
    await page.keyboard.press('c')
    // After one press the category filter should no longer be "all"
    // The Reset view button appears when a non-default filter is active
    await expect(page.getByRole('button', { name: /reset view/i })).toBeVisible({ timeout: 3_000 })
  })

  test('pressing C multiple times cycles through all categories and wraps back to all', async ({ page }) => {
    // Count how many category options exist by looking at the select
    const categoryTrigger = page.locator('text=All categories').first()
    await categoryTrigger.click()
    const items = page.locator('[role="option"]')
    const count = await items.count()
    await page.keyboard.press('Escape') // close the dropdown

    // Press C `count` times to wrap all the way back to "all"
    for (let i = 0; i < count; i++) {
      await page.keyboard.press('c')
    }

    // Should have wrapped back: Reset view button should no longer be shown
    await expect(page.getByRole('button', { name: /reset view/i })).not.toBeVisible({ timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // S key cycles the sort order
  // -------------------------------------------------------------------------
  test('pressing S changes the sort order', async ({ page }) => {
    // Before: no "Reset view" button (default sort = name-asc)
    await expect(page.getByRole('button', { name: /reset view/i })).not.toBeVisible()

    await page.keyboard.press('s')

    // A non-default sort means the reset button should appear
    await expect(page.getByRole('button', { name: /reset view/i })).toBeVisible({ timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // F key cycles the billing cycle filter
  // -------------------------------------------------------------------------
  test('pressing F cycles the billing cycle filter', async ({ page }) => {
    await expect(page.getByRole('button', { name: /reset view/i })).not.toBeVisible()

    await page.keyboard.press('f')

    await expect(page.getByRole('button', { name: /reset view/i })).toBeVisible({ timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // A key opens Add Subscription popover and focuses the name field
  // -------------------------------------------------------------------------
  test('pressing A opens the Add Subscription popover', async ({ page }) => {
    await page.keyboard.press('a')

    // The popover/modal heading should appear
    await expect(page.getByText('Add Subscription').nth(1)).toBeVisible({ timeout: 3_000 })
  })

  test('name input is focused after pressing A to open the add form', async ({ page }) => {
    await page.keyboard.press('a')

    // Wait for the form to render
    await page.waitForSelector('#name', { timeout: 5_000 })

    // The name input should have focus
    const nameInput = page.locator('#name')
    await expect(nameInput).toBeFocused({ timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // Shortcuts are NOT triggered when typing in an input field
  // -------------------------------------------------------------------------
  test('keyboard shortcuts are suppressed when the search bar is focused', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first()
    await searchInput.click()
    await searchInput.type('c') // typing "c" in search should NOT cycle the category filter

    // Reset button should NOT appear (filter hasn't changed)
    await expect(page.getByRole('button', { name: /reset view/i })).not.toBeVisible()

    // The search bar should contain the typed character
    await expect(searchInput).toHaveValue('c')
  })

  // -------------------------------------------------------------------------
  // ? key opens the keyboard shortcuts dialog
  // -------------------------------------------------------------------------
  test('pressing ? shows the keyboard shortcuts dialog', async ({ page }) => {
    await page.keyboard.press('?')

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await expect(dialog).toContainText('Keyboard Shortcuts')
  })

  test('keyboard shortcuts dialog lists C (cycle category filter) and A (focus add form)', async ({ page }) => {
    await page.keyboard.press('?')

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Cycle category filter')
    await expect(dialog).toContainText('Focus Add Subscription form')
  })
})
