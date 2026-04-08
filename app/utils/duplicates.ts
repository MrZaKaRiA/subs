import type { Subscription } from '~/store/subscriptionStore'

/**
 * Normalize a domain string for deduplication purposes.
 * Strips protocol, www prefix, and trailing slashes, lowercases.
 */
function normalizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .toLowerCase()
    .split('/')[0] // only the hostname
}

/**
 * Create a fingerprint for a subscription using normalized domain + price + currency.
 */
export function getSubscriptionFingerprint(sub: Pick<Subscription, 'domain' | 'price' | 'currency'>): string {
  return `${normalizeDomain(sub.domain)}:${sub.price}:${sub.currency.toUpperCase()}`
}

/**
 * Find subscriptions from `incoming` that are duplicates of any in `existing`.
 * Optionally exclude a specific id (e.g. when editing an existing subscription).
 *
 * Returns pairs of { incoming, existing } for each duplicate found.
 */
export function findDuplicates(
  incoming: Subscription[],
  existing: Subscription[],
  excludeId?: string,
): Array<{ incoming: Subscription; existing: Subscription }> {
  const results: Array<{ incoming: Subscription; existing: Subscription }> = []
  for (const inc of incoming) {
    const incFingerprint = getSubscriptionFingerprint(inc)
    for (const ex of existing) {
      if (excludeId && ex.id === excludeId) continue
      if (getSubscriptionFingerprint(ex) === incFingerprint) {
        results.push({ incoming: inc, existing: ex })
        break // only report the first matching existing entry per incoming
      }
    }
  }
  return results
}
