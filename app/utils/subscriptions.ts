import { MONTHLY_MULTIPLIER } from '~/lib/utils'
import type { Subscription } from '~/store/subscriptionStore'
import type { SupportedCurrency } from '~/types/currencies'

export type CurrencyTotals = { [key in SupportedCurrency]?: number }

export function calculateTotals(subscriptions: Subscription[], rates: Record<string, number> | null): CurrencyTotals {
  if (!rates) return {}
  return subscriptions.reduce((acc: CurrencyTotals, sub) => {
    const currency = sub.currency as SupportedCurrency
    const multiplier = sub.billingCycle ? MONTHLY_MULTIPLIER[sub.billingCycle] : 1
    acc[currency] = (acc[currency] ?? 0) + sub.price * multiplier
    return acc
  }, {})
}
