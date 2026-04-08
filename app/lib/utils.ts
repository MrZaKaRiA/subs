import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { BillingCycle } from '~/store/subscriptionStore'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const MONTHLY_MULTIPLIER: Record<BillingCycle, number> = {
  daily: 30.44,
  weekly: 4.35,
  monthly: 1,
  yearly: 1 / 12,
}

/**
 * Convert an `amount` denominated in `fromCurrency` to `toCurrency`.
 * `rates` must be a USD-based map (1 USD = rates[currency]).
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number {
  const fromRate = rates[fromCurrency] ?? 1
  const toRate = rates[toCurrency] ?? 1
  return (amount / fromRate) * toRate
}

/** Returns the currency symbol for a given ISO 4217 currency code. */
export function getCurrencySymbol(currency: string): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(0)
      .replace(/[\d,. ]/g, '')
      .trim()
  } catch {
    return currency
  }
}

/** Formats an ISO date string for display (e.g. "Jan 1, 2025"). */
export function formatDateForDisplay(dateString: string | undefined): string {
  if (!dateString) return 'Pick a date'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Sanitizes a raw domain string into a valid absolute URL.
 * Falls back to `https://example.com` if the input is unparseable.
 */
export function sanitizeDomain(domain: string): string {
  try {
    return new URL(domain).href
  } catch {
    try {
      return new URL(`https://${domain}`).href
    } catch {
      return 'https://example.com'
    }
  }
}
