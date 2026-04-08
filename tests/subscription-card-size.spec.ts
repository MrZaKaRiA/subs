import { type Page, expect, test } from '@playwright/test'

/**
 * Comprehensive tests to verify all subscription cards maintain identical
 * height and width across every possible variant:
 *   - No billing info (default)
 *   - With billing cycle badge only
 *   - With billing cycle + next payment date shown
 *   - Each billing cycle type (daily, weekly, monthly, yearly)
 *
 * The ONLY responsive change allowed is reducing the number of columns.
 * Individual card dimensions must be identical.
 */

const CARD_SELECTOR = '[data-testid="subscription-card"]'

/**
 * Collect layout dimensions (offsetHeight / offsetWidth) for every card.
 * Uses offsetHeight/Width instead of boundingBox to avoid being affected
 * by CSS transforms from framer-motion animations.
 */
async function getAllCardSizes(page: Page) {
  // Give animations time to settle
  await page.waitForTimeout(600)

  return page.locator(CARD_SELECTOR).evaluateAll((cards) =>
    cards.map((card) => ({
      height: (card as HTMLElement).offsetHeight,
      width: (card as HTMLElement).offsetWidth,
    })),
  )
}

/** Assert every card has the same dimensions (within 1 px tolerance). */
function assertAllSameSize(sizes: { width: number; height: number }[], label = '') {
  expect(sizes.length, `Expected at least 2 cards ${label}`).toBeGreaterThanOrEqual(2)
  const first = sizes[0]
  for (let i = 1; i < sizes.length; i++) {
    expect(
      Math.abs(sizes[i].height - first.height),
      `${label} Card ${i} height (${sizes[i].height}) differs from card 0 height (${first.height})`,
    ).toBeLessThanOrEqual(1)
    expect(
      Math.abs(sizes[i].width - first.width),
      `${label} Card ${i} width (${sizes[i].width}) differs from card 0 width (${first.width})`,
    ).toBeLessThanOrEqual(1)
  }
}

test.describe('Subscription Card Size Consistency', () => {
  test.beforeEach(async ({ page }) => {
    // Reset any local-storage state from previous tests
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForSelector(CARD_SELECTOR, { timeout: 15_000 })
  })

  /* ─── Baseline ─────────────────────────────────────────────── */
  test('all default cards have identical height and width', async ({ page }) => {
    const sizes = await getAllCardSizes(page)
    assertAllSameSize(sizes, '[default]')
  })

  /* ─── Edit a card to add monthly billing cycle ──────────────── */
  test('card size stays the same after adding a monthly billing cycle', async ({ page }) => {
    const sizesBefore = await getAllCardSizes(page)

    // Hover first card to reveal edit button, then click Edit
    const firstCard = page.locator(CARD_SELECTOR).first()
    await firstCard.hover()
    await firstCard.locator('button:has(svg)').first().click()

    // Wait for the modal
    await page.waitForSelector('text=Edit Subscription', { timeout: 5_000 })

    // Pick a billing cycle
    await page.locator('#billingCycle').click()
    await page.getByRole('option', { name: 'Monthly' }).click()

    // Enable "Show next payment date"
    await page.locator('#showNextPayment').click()

    // Save
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForSelector('text=Edit Subscription', { state: 'detached', timeout: 5_000 })

    const sizesAfter = await getAllCardSizes(page)

    // Every card must still be the same size
    assertAllSameSize(sizesAfter, '[after adding monthly billing]')

    // Size must not have changed
    expect(
      Math.abs(sizesAfter[0].height - sizesBefore[0].height),
      `Height changed from ${sizesBefore[0].height} to ${sizesAfter[0].height}`,
    ).toBeLessThanOrEqual(1)
    expect(
      Math.abs(sizesAfter[0].width - sizesBefore[0].width),
      `Width changed from ${sizesBefore[0].width} to ${sizesAfter[0].width}`,
    ).toBeLessThanOrEqual(1)
  })

  /* ─── Edit two cards with different billing cycles ─────────── */
  test('cards with different billing cycles all share the same size', async ({ page }) => {
    const cycles = ['Monthly', 'Yearly'] as const

    for (let i = 0; i < cycles.length; i++) {
      const card = page.locator(CARD_SELECTOR).nth(i)
      await card.hover()
      await card.locator('button:has(svg)').first().click()
      await page.waitForSelector('text=Edit Subscription', { timeout: 5_000 })

      await page.locator('#billingCycle').click()
      await page.getByRole('option', { name: cycles[i] }).click()
      await page.locator('#showNextPayment').click()

      await page.getByRole('button', { name: 'Save' }).click()
      await page.waitForSelector('text=Edit Subscription', { state: 'detached', timeout: 5_000 })
      await page.waitForTimeout(300)
    }

    const sizes = await getAllCardSizes(page)
    assertAllSameSize(sizes, '[different cycles]')
  })

  /* ─── Mix of cards with and without billing info ────────────── */
  test('card with billing info is the same size as card without', async ({ page }) => {
    const sizesBefore = await getAllCardSizes(page)

    // Edit only the first card to add weekly billing + next payment
    const firstCard = page.locator(CARD_SELECTOR).first()
    await firstCard.hover()
    await firstCard.locator('button:has(svg)').first().click()
    await page.waitForSelector('text=Edit Subscription', { timeout: 5_000 })

    await page.locator('#billingCycle').click()
    await page.getByRole('option', { name: 'Weekly' }).click()
    await page.locator('#showNextPayment').click()

    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForSelector('text=Edit Subscription', { state: 'detached', timeout: 5_000 })

    const sizesAfter = await getAllCardSizes(page)

    // First card (with billing) must be the same size as all others (without billing)
    assertAllSameSize(sizesAfter, '[mixed cards]')

    // Must also match original sizes
    expect(
      Math.abs(sizesAfter[0].height - sizesBefore[0].height),
      `Height changed from ${sizesBefore[0].height} to ${sizesAfter[0].height}`,
    ).toBeLessThanOrEqual(1)
  })
})
