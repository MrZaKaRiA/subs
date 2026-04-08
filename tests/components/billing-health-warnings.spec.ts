import { expect, test } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CARD = '[data-testid="subscription-card"]'

/** Clear all storage and reload to a known clean state. */
async function freshPage(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('main', { timeout: 15_000 })
}

/** Upload a JSON payload to the hidden file input. */
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

test.describe('Billing Health Warnings', () => {
  test.beforeEach(async ({ page }) => {
    await freshPage(page)
  })

  test('no warning icon for a subscription with no billing cycle', async ({ page }) => {
    // Import a subscription that has NO billingCycle
    await importSubscriptions(page, [
      { id: 'h1', name: 'No Cycle Sub', price: 10, currency: 'USD', domain: 'https://nocycle.com' },
    ])
    // Wait for the card to appear
    await page.waitForSelector(CARD, { timeout: 5_000 })

    const card = page.locator(CARD).filter({ hasText: 'No Cycle Sub' })
    // AlertTriangle icon should NOT be present
    await expect(card.locator('svg.lucide-triangle-alert')).not.toBeVisible()
  })

  test('warning shown when billingCycle is set but showNextPayment is false', async ({ page }) => {
    await importSubscriptions(page, [
      {
        id: 'h2',
        name: 'Has Cycle No Date',
        price: 10,
        currency: 'USD',
        domain: 'https://warnme.com',
        billingCycle: 'monthly',
        showNextPayment: false,
      },
    ])
    await page.waitForSelector(CARD, { timeout: 5_000 })

    const card = page.locator(CARD).filter({ hasText: 'Has Cycle No Date' })
    // Billing cycle badge should be visible
    await expect(card.getByText('Monthly')).toBeVisible()
    // Warning triangle must appear
    await expect(card.locator('svg').filter({ has: page.locator('[class*="yellow"]') })).toBeVisible()
  })

  test('tooltip for cycle-set-but-hidden warning describes the issue correctly', async ({ page }) => {
    await importSubscriptions(page, [
      {
        id: 'h3',
        name: 'Cycle Warning Tooltip',
        price: 15,
        currency: 'USD',
        domain: 'https://tooltip.com',
        billingCycle: 'yearly',
        showNextPayment: false,
      },
    ])
    await page.waitForSelector(CARD, { timeout: 5_000 })

    const card = page.locator(CARD).filter({ hasText: 'Cycle Warning Tooltip' })
    // Hover the warning icon to trigger the tooltip
    const warningIcon = card.locator('[class*="yellow"]').first()
    await warningIcon.hover()

    await expect(page.getByRole('tooltip')).toContainText(/billing cycle set but next payment date is not shown/i)
  })

  test('no warning when billingCycle and showNextPayment are both set with a future date', async ({ page }) => {
    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + 1)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    await importSubscriptions(page, [
      {
        id: 'h4',
        name: 'Healthy Sub',
        price: 20,
        currency: 'USD',
        domain: 'https://healthy.com',
        billingCycle: 'monthly',
        showNextPayment: true,
        nextPaymentDate: futureDateStr,
      },
    ])
    await page.waitForSelector(CARD, { timeout: 5_000 })

    const card = page.locator(CARD).filter({ hasText: 'Healthy Sub' })
    // No triangle warning should appear
    await expect(card.locator('[class*="yellow"]')).not.toBeVisible()
  })

  test('warning shown when stored nextPaymentDate is in the past', async ({ page }) => {
    await importSubscriptions(page, [
      {
        id: 'h5',
        name: 'Past Date Sub',
        price: 8,
        currency: 'USD',
        domain: 'https://pastdate.com',
        billingCycle: 'monthly',
        showNextPayment: true,
        nextPaymentDate: '2020-01-01',
      },
    ])
    await page.waitForSelector(CARD, { timeout: 5_000 })

    const card = page.locator(CARD).filter({ hasText: 'Past Date Sub' })
    // Warning triangle should appear (raw stored date is in the past)
    await expect(card.locator('[class*="yellow"]')).toBeVisible()

    // Tooltip should mention "past"
    await card.locator('[class*="yellow"]').first().hover()
    await expect(page.getByRole('tooltip')).toContainText(/past/i)
  })
})
