import { useRef } from 'react'
import { toast } from 'sonner'
import type { Subscription } from '~/store/subscriptionStore'

type PendingDeletion = {
  sub: Subscription
  index: number
  timeoutId: ReturnType<typeof setTimeout>
}

interface Props {
  subscriptions: Subscription[]
  deleteSubscription: (id: string) => void
  restoreSubscription: (sub: Subscription, index: number) => void
}

export function useDeleteWithUndo({ subscriptions, deleteSubscription, restoreSubscription }: Props) {
  const pendingDeletion = useRef<PendingDeletion | null>(null)

  const handleDelete = (id: string) => {
    const index = subscriptions.findIndex((s) => s.id === id)
    const sub = subscriptions[index]
    if (!sub) return

    // Flush any in-flight pending deletion before starting a new one
    if (pendingDeletion.current) {
      clearTimeout(pendingDeletion.current.timeoutId)
      deleteSubscription(pendingDeletion.current.sub.id)
      pendingDeletion.current = null
    }

    deleteSubscription(id)

    const timeoutId = setTimeout(() => {
      pendingDeletion.current = null
    }, 5000)

    pendingDeletion.current = { sub, index, timeoutId }

    toast(`${sub.name} deleted`, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          if (pendingDeletion.current?.sub.id === sub.id) {
            clearTimeout(pendingDeletion.current.timeoutId)
            restoreSubscription(pendingDeletion.current.sub, pendingDeletion.current.index)
            pendingDeletion.current = null
          }
        },
      },
    })
  }

  return { handleDelete }
}
