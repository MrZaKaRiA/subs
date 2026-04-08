import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type React from 'react'
import { Button } from '~/components/ui/button'
import { POPULAR_TEMPLATES } from '~/lib/templates'
import type { Subscription, SubscriptionTemplate } from '~/store/subscriptionStore'
import SubscriptionCard from './SubscriptionCard'

// Re-export so existing callsites keep working
export const QUICK_ADD_TEMPLATES = POPULAR_TEMPLATES

interface SubscriptionGridProps {
  subscriptions: Subscription[]
  onEditSubscription: (id: string) => void
  onDeleteSubscription: (id: string) => void
  searchQuery?: string
  onClearSearch?: () => void
  onAddSubscription?: () => void
  onAddWithTemplate?: (template: SubscriptionTemplate) => void
  onQuickSetup?: () => void
  totalCount?: number
}

const SubscriptionGrid: React.FC<SubscriptionGridProps> = ({
  subscriptions,
  onEditSubscription,
  onDeleteSubscription,
  searchQuery,
  onClearSearch,
  onAddSubscription,
  onAddWithTemplate,
  onQuickSetup,
  totalCount = 0,
}) => {
  const hasSearchQuery = Boolean(searchQuery && searchQuery.trim().length > 0)
  const isGenuinelyEmpty = totalCount === 0

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
        <div className="col-span-full text-center py-12 border border-dashed rounded-xl bg-muted/30">
          <p className="text-xl text-foreground font-semibold mb-2">
            {hasSearchQuery ? 'No matching subscriptions' : 'No subscriptions yet'}
          </p>
          {hasSearchQuery ? (
            <p className="text-sm text-muted-foreground mb-6">
              Try a different keyword or clear your search to browse everything.
            </p>
          ) : (
            <div className="mb-6">
              {onQuickSetup ? (
                <Button onClick={onQuickSetup} className="gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Quick Setup
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Start with a popular template or add your own.</p>
              )}
            </div>
          )}
          {hasSearchQuery && onClearSearch && (
            <Button variant="outline" onClick={onClearSearch}>
              Clear search
            </Button>
          )}
          {!hasSearchQuery && isGenuinelyEmpty && onAddWithTemplate && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {QUICK_ADD_TEMPLATES.map((template) => (
                  <Button key={template.label} variant="outline" size="sm" onClick={() => onAddWithTemplate(template)}>
                    {template.label}
                  </Button>
                ))}
              </div>
              {onAddSubscription && (
                <Button variant="ghost" size="sm" onClick={onAddSubscription}>
                  Start from scratch
                </Button>
              )}
            </div>
          )}
          {!hasSearchQuery && !isGenuinelyEmpty && onAddSubscription && (
            <Button onClick={onAddSubscription}>Add subscription</Button>
          )}
          {!hasSearchQuery && isGenuinelyEmpty && !onAddWithTemplate && onAddSubscription && (
            <Button onClick={onAddSubscription}>Add subscription</Button>
          )}
        </div>
      )}
    </div>
  )
}

export default SubscriptionGrid
