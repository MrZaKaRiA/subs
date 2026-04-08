import { AnimatePresence, motion } from 'framer-motion'
import type React from 'react'
import { Button } from '~/components/ui/button'
import type { Subscription } from '~/store/subscriptionStore'
import SubscriptionCard from './SubscriptionCard'

interface SubscriptionGridProps {
  subscriptions: Subscription[]
  onEditSubscription: (id: string) => void
  onDeleteSubscription: (id: string) => void
  searchQuery?: string
  onClearSearch?: () => void
  onAddSubscription?: () => void
}

const SubscriptionGrid: React.FC<SubscriptionGridProps> = ({
  subscriptions,
  onEditSubscription,
  onDeleteSubscription,
  searchQuery,
  onClearSearch,
  onAddSubscription,
}) => {
  const hasSearchQuery = Boolean(searchQuery && searchQuery.trim().length > 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <AnimatePresence>
        {subscriptions.map((subscription) => (
          <motion.div
            key={subscription.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <SubscriptionCard
              subscription={subscription}
              onEdit={() => onEditSubscription(subscription.id)}
              onDelete={() => onDeleteSubscription(subscription.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      {subscriptions.length === 0 && (
        <div className="col-span-full text-center py-10 border border-dashed rounded-xl bg-muted/30">
          <p className="text-xl text-foreground font-semibold mb-2">
            {hasSearchQuery ? 'No matching subscriptions' : 'No subscriptions yet'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {hasSearchQuery
              ? 'Try a different keyword or clear your search to browse everything.'
              : 'Add your first subscription to start tracking your monthly costs.'}
          </p>
          <div className="flex items-center justify-center gap-2">
            {hasSearchQuery && onClearSearch && (
              <Button variant="outline" onClick={onClearSearch}>
                Clear search
              </Button>
            )}
            {!hasSearchQuery && onAddSubscription && <Button onClick={onAddSubscription}>Add subscription</Button>}
          </div>
        </div>
      )}
    </div>
  )
}

export default SubscriptionGrid
