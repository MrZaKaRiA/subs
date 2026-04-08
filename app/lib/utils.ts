import { type ClassValue, clsx } from 'clsx'
import { useEffect, useState } from 'react'
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

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)

    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => setMatches(event.matches)

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}
