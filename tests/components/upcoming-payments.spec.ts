import { expect, test } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** ISO date string N days from today. */
function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

/**
 * Intercept storage API with a specific list of subscriptions.
 * PUT / DELETE are swallowed so no data is written to disk.
 */
async function mockStorage(
  page: import('@playwright/test').Page,
  subscriptions: unknown[],
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

const PANEL_HEADING = /upcoming payments/i
const MARKER_7 = /next 7 days/i
const MARKER_30 = /next 30 days/i

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Upcoming Payments Panel (Feature 6)', () => {
  // -------------------------------------------------------------------------
  // 1. Panel is hidden when no subscriptions have upcoming payments enabled
  // -------------------------------------------------------------------------
  test('panel is not rendered when no subscription has showNextPayment enabled', async ({ page }) => {
    await mockStorage(page, [
      {
        id: '1',
        name: 'Netflix',
        price: 15.99,
        currency: 'USD',
        domain: 'https://netflix.com',
        billingCycle: 'monthly',
        showNextPayment: false, // explicitly disabled
      },
    ])
    await page.goto('/')
    await page.waitForSelector('main', { timeout: 15_000 })

    await expect(page.getByText(PANEL_HEADING)).not.toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 2. Panel is hidden when all upcoming dates are beyond 30 days
  // -------------------------------------------------------------------------
  test('panel is not rendered when no payment is due within 30 days', async ({ page }) => {
    await mockStorage(page, [
      {
        id: '1',
        name: 'Far Future',
        price: 9.99,
        currency: 'USD',
        domain: 'https://spotify.com',
        billingCycle: 'monthly',
        showNextPayment: true,
        nextPaymentDate: daysFromNow(45), // outside 30-day window
      },
    ])
    await page.goto('/')
    await page.waitForSelector('main', { timeout: 15_000 })

    await expect(page.getByText(PANEL_HEADING)).not.toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 3. Panel appears when a payment is due within 7 days
  // -------------------------------------------------------------------------
  test('panel is visible and shows subscription due within 7 days', async ({ page }) => {
    await mockStorage(page, [
      {
        id: '1',
        name: 'Netflix',
        price: 15.99,
        currency: 'USD',
        domain: 'https://netflix.com',
        billingCycle: 'monthly',
        showNextPayment: true,
        nextPaymentDate: daysFromNow(3),
      },
    ])
    await page.goto('/')
    await page.waitForSelector('main', { timeout: 15_000 })

    await expect(page.getByText(PANEL_HEADING)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(MARKER_7)).toBeVisible()
    await expect(page.getByText('Netflix')).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 4. Items due 8–30 days away appear in the "Next 30 days" column
  // -------------------------------------------------------------------------
  test('subscription due in 15 days appears in Next 30 days column, not Next 7 days', async ({ page }) => {
    await mockStorage(page, [
      {
        id: '1',
        name: 'Spotify',
        price: 9.99,
        currency: 'USD',
        domain: 'https://spotify.com',
        billingCycle: 'monthly',
        showNextPayment: true,
        nextPaymentDate: daysFromNow(15),
      },
    ])
    await page.goto('/')
    await page.waitForSelector('main', { timeout: 15_000 })

    await expect(page.getByText(PANEL_HEADING)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(MARKER_30)).toBeVisible()
    // Should NOT appear in the 7-day bucket
    await expect(page.getByText(MARKER_7)).not.toBeVisible()
    await expect(page.getByText('Spotify')).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 5. Both columns render when items span the two windows
  // -------------------------------------------------------------------------
  test('both columns render when payments fall in different windows', async ({ page }) => {
    await mockStorage(page, [
      {
        id: '1',
        name: 'Netflix',
        price: 15.99,
        currency: 'USD',
        domain: 'https://netflix.com',
        billingCycle: 'monthly',
        showNextPayment: true,
        nextPaymentDate: daysFromNow(2),
      },
      {
        id: '2',
        name: 'Spotify',
        price: 9.99,
        currency: 'USD',
        domain: 'https://spotify.com',
        billingCycle: 'monthly',
        showNextPayment: true,
        nextPaymentDate: daysFromNow(20),
      },
    ])
    await page.goto('/')
    await page.waitForSelector('main', { timeout: 15_000 })

    await expect(page.getByText(PANEL_HEADING)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(MARKER_7)).toBeVisible()
    await expect(page.getByText(MARKER_30)).toBeVisible()
    await expect(page.getByText('Netflix')).toBeVisible()
    await expect(page.getByText('Spotify')).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 6. Subscriptions with showNextPayment disabled are excluded
  // -------------------------------------------------------------------------
  test('subscription with showNextPayment=false is not listed in the panel', async ({ page }) => {
    await mockStorage(page, [
      // This one should appear
      {
        id: '1',
        name: 'Netflix',
        price: 15.99,
        currency: 'USD',
        domain: 'https://netflix.com',
        billingCycle: 'monthly',
        showNextPayment: true,
        nextPaymentDate: daysFromNow(4),
      },
      // This one should NOT appear (showNextPayment is off)
      {
        id: '2',
        name: 'Spotify',
        price: 9.99,
        currency: 'USD',
        domain: 'https://spotify.com',
        billingCycle: 'monthly',
        showNextPayment: false,
        nextPaymentDate: daysFromNow(2),
      },
    ])
    await page.goto('/')
    await page.waitForSelector('main', { timeout: 15_000 })

    await expect(page.getByText(PANEL_HEADING)).toBeVisible({ timeout: 5_000 })
    // Netflix (enabled) shows; Spotify (disabled) does not
    const panel = page.locator('section, div').filter({ has: page.getByText(PANEL_HEADING) }).first()
    await expect(panel.getByText('Netflix')).toBeVisible()
    await expect(panel.getByText('Spotify')).not.toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 7. "Mark paid" button advances the date by one billing cycle
  // -------------------------------------------------------------------------
  test('clicking Mark paid rolls the payment date forward by one cycle', async ({ page }) => {
    const nextDate = daysFromNow(3)
    let putBody: unknown = null

    await page.route('/api/storage/subscription-storage', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            value: {
              state: {
                subscriptions: [
                  {
                    id: '1',
                    name: 'Netflix',
                    price: 15.99,
                    currency: 'USD',
                    domain: 'https://netflix.com',
                    billingCycle: 'monthly',
                    showNextPayment: true,
                    nextPaymentDate: nextDate,
                  },
                ],
              },
              version: 0,
            },
          }),
        })
      } else if (route.request().method() === 'PUT') {
        putBody = await route.request().postDataJSON()
        await route.fulfill({ status: 200, body: '{}' })
      } else {
        await route.continue()
      }
    })

    await page.goto('/')
    await page.waitForSelector('main', { timeout: 15_000 })
    await expect(page.getByText(PANEL_HEADING)).toBeVisible({ timeout: 5_000 })

    // Click the Mark paid button next to Netflix
    const markPaidBtn = page.getByRole('button', { name: /mark paid/i }).first()
    await markPaidBtn.click()

    // After clicking, the subscription should disappear from the panel
    // (date is now in the future beyond the 30-day window, OR the panel re-renders)
    // Also verify that the store was written (PUT was called)
    await page.waitForFunction(() => true) // flush microtasks
    // Give the async storage setItem a moment to fire
    await page.waitForTimeout(500)
    expect(putBody).not.toBeNull()

    // The new stored nextPaymentDate should be approximately 1 month ahead
    // (we just verify it was persisted — the exact date is tested via unit logic)
    const stored = putBody as { value: { state: { subscriptions: Array<{ nextPaymentDate: string }> } } }
    const newDate = new Date(stored.value.state.subscriptions[0].nextPaymentDate)
    const originalDate = new Date(nextDate)
    // Difference should be roughly 28-31 days (monthly cycle)
    const diffMs = newDate.getTime() - originalDate.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThanOrEqual(28)
    expect(diffDays).toBeLessThanOrEqual(31)
  })
})
