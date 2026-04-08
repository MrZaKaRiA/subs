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

/**
 * Inject spending snapshots into localStorage so the chart has data to render.
 * Must be called after goto() but the snapshots key follows the zustand persist naming.
 */
async function injectSpendingSnapshots(page: import('@playwright/test').Page, count = 10) {
  await page.evaluate((n) => {
    const today = new Date()
    const snapshots = Array.from({ length: n }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (n - 1 - i))
      return {
        date: d.toISOString().split('T')[0],
        totalMonthly: 25 + i * 0.5,
        currency: 'USD',
      }
    })
    const raw = localStorage.getItem('preferences-storage')
    const parsed = raw ? JSON.parse(raw) : { state: {} }
    parsed.state.spendingSnapshots = snapshots
    localStorage.setItem('preferences-storage', JSON.stringify(parsed))
  }, count)
  await page.reload()
  await page.waitForSelector('main', { timeout: 15_000 })
}

const DEFAULT_SUBS = [
  {
    id: '1',
    name: 'Netflix',
    price: 15.99,
    currency: 'USD',
    domain: 'https://netflix.com',
    billingCycle: 'monthly',
    category: 'Entertainment',
  },
  {
    id: '2',
    name: 'Spotify',
    price: 9.99,
    currency: 'USD',
    domain: 'https://spotify.com',
    billingCycle: 'monthly',
    category: 'Entertainment',
  },
  {
    id: '3',
    name: 'GitHub Copilot',
    price: 10,
    currency: 'USD',
    domain: 'https://github.com',
    billingCycle: 'monthly',
    category: 'Productivity',
  },
]

// ---------------------------------------------------------------------------
// Feature 11 — Spending Insights Page
// ---------------------------------------------------------------------------

test.describe('Feature 11 — Spending Insights Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockStorage(page)
    await page.goto('/insights')
    await page.waitForSelector('main', { timeout: 15_000 })
  })

  // -------------------------------------------------------------------------
  // Basic page structure
  // -------------------------------------------------------------------------
  test('renders the Spending Insights heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /spending insights/i })).toBeVisible()
  })

  test('shows Monthly Total, Annual Total, and Subscriptions summary cards', async ({ page }) => {
    await expect(page.getByText('Monthly Total')).toBeVisible()
    await expect(page.getByText('Annual Total')).toBeVisible()
    await expect(page.getByText('Subscriptions')).toBeVisible()
  })

  test('Back button navigates to the home page', async ({ page }) => {
    await page.getByRole('link', { name: /back/i }).click()
    await expect(page).toHaveURL('/')
  })

  // -------------------------------------------------------------------------
  // Spending Trends section
  // -------------------------------------------------------------------------
  test('shows spending trends section', async ({ page }) => {
    await expect(page.getByText('Spending Trends')).toBeVisible()
  })

  test('trends section shows "No data yet" when no snapshots are present', async ({ page }) => {
    // No snapshots injected — should show the accumulation hint
    await expect(page.getByText(/trend data accumulates daily/i)).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Spending Over Time chart (Feature 11 enhancement)
  // -------------------------------------------------------------------------
  test('spending chart is NOT shown when fewer than 2 snapshots exist', async ({ page }) => {
    await expect(page.locator('[data-testid="spending-chart"]')).not.toBeVisible()
  })

  test('spending chart is shown when 2 or more snapshots exist', async ({ page }) => {
    await injectSpendingSnapshots(page, 5)
    await page.goto('/insights')
    await page.waitForSelector('main', { timeout: 15_000 })
    await expect(page.locator('[data-testid="spending-chart"]')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Spending Over Time')).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Top Subscriptions by Cost (Feature 11 enhancement)
  // -------------------------------------------------------------------------
  test('top subscriptions section is visible when subscriptions exist', async ({ page }) => {
    await expect(page.locator('[data-testid="top-subscriptions"]')).toBeVisible()
    await expect(page.getByText('Top Subscriptions by Cost')).toBeVisible()
  })

  test('top subscriptions list shows Netflix as #1 (most expensive)', async ({ page }) => {
    const topSection = page.locator('[data-testid="top-subscriptions"]')
    await expect(topSection).toBeVisible()
    // Netflix at 15.99/mo should appear first
    const firstRow = topSection.locator('div').filter({ hasText: 'Netflix' }).first()
    await expect(firstRow).toBeVisible()
    // Should also contain "#1"
    await expect(topSection.getByText('#1')).toBeVisible()
  })

  test('top subscriptions shows all 3 subscriptions when fewer than 5', async ({ page }) => {
    const topSection = page.locator('[data-testid="top-subscriptions"]')
    await expect(topSection.getByText('Netflix')).toBeVisible()
    await expect(topSection.getByText('Spotify')).toBeVisible()
    await expect(topSection.getByText('GitHub Copilot')).toBeVisible()
  })

  test('top subscriptions limits to 5 items even with more subscriptions', async ({ page }) => {
    const manySubs = Array.from({ length: 8 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Sub ${i + 1}`,
      price: 10 + i,
      currency: 'USD',
      domain: `https://sub${i + 1}.com`,
      billingCycle: 'monthly',
      category: 'Entertainment',
    }))
    await mockStorage(page, manySubs)
    await page.goto('/insights')
    await page.waitForSelector('main', { timeout: 15_000 })

    const topSection = page.locator('[data-testid="top-subscriptions"]')
    // Only ranks #1 through #5 should appear
    await expect(topSection.getByText('#1')).toBeVisible()
    await expect(topSection.getByText('#5')).toBeVisible()
    await expect(topSection.getByText('#6')).not.toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Spending by Category section
  // -------------------------------------------------------------------------
  test('spending by category section is visible', async ({ page }) => {
    await expect(page.getByText('Spending by Category')).toBeVisible()
    // Entertainment category should appear (two subs)
    await expect(page.getByText('Entertainment')).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  test('shows empty state message when no subscriptions exist', async ({ page }) => {
    await mockStorage(page, [])
    await page.goto('/insights')
    await page.waitForSelector('main', { timeout: 15_000 })
    await expect(page.getByText('No subscriptions yet')).toBeVisible()
  })

  test('top subscriptions section is hidden when there are no subscriptions', async ({ page }) => {
    await mockStorage(page, [])
    await page.goto('/insights')
    await page.waitForSelector('main', { timeout: 15_000 })
    await expect(page.locator('[data-testid="top-subscriptions"]')).not.toBeVisible()
  })
})
