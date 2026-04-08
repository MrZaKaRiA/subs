import { AlertTriangle } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import type { Subscription } from '~/store/subscriptionStore'

export type ImportDuplicateAction = 'skip' | 'keep-both' | 'replace'

interface ImportDuplicateDialogProps {
  isOpen: boolean
  onClose: () => void
  duplicates: Array<{ incoming: Subscription; existing: Subscription }>
  onResolve: (action: ImportDuplicateAction) => void
}

export default function ImportDuplicateDialog({ isOpen, onClose, duplicates, onResolve }: ImportDuplicateDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Duplicate subscriptions detected
          </DialogTitle>
          <DialogDescription>
            {duplicates.length === 1
              ? '1 subscription in the import file matches an existing entry.'
              : `${duplicates.length} subscriptions in the import file match existing entries.`}{' '}
            How would you like to handle them?
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-48 overflow-y-auto rounded-md border p-3 space-y-2">
          {duplicates.map(({ incoming, existing }) => (
            <div key={incoming.id} className="text-sm">
              <span className="font-medium">{incoming.name}</span>
              <span className="text-muted-foreground">
                {' '}
                — {incoming.currency} {incoming.price.toFixed(2)} at{' '}
              </span>
              <span className="text-muted-foreground">{incoming.domain}</span>
              <div className="text-xs text-muted-foreground mt-0.5">
                Existing: <span className="font-medium">{existing.name}</span> ({existing.currency}{' '}
                {existing.price.toFixed(2)})
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onResolve('skip')} className="flex-1">
            Skip duplicates
          </Button>
          <Button variant="outline" onClick={() => onResolve('keep-both')} className="flex-1">
            Keep both
          </Button>
          <Button onClick={() => onResolve('replace')} className="flex-1">
            Replace existing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
