import { useState } from 'react'
import { toast } from 'sonner'
import type { Subscription, SubscriptionTemplate } from '~/store/subscriptionStore'
import { findDuplicates } from '~/utils/duplicates'

interface Props {
  subscriptions: Subscription[]
  addSubscription: (sub: Omit<Subscription, 'id'>) => void
  editSubscription: (id: string, sub: Partial<Omit<Subscription, 'id'>>) => void
}

export function useSubscriptionModal({ subscriptions, addSubscription, editSubscription }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [pendingTemplate, setPendingTemplate] = useState<SubscriptionTemplate | null>(null)

  const openEdit = (id: string) => {
    const sub = subscriptions.find((s) => s.id === id)
    if (!sub) return
    setEditingSubscription(sub)
    setPendingTemplate(null)
    setIsOpen(true)
  }

  const openWithTemplate = (template: SubscriptionTemplate) => {
    setPendingTemplate(template)
    setEditingSubscription(null)
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
    setPendingTemplate(null)
  }

  const save = (data: Omit<Subscription, 'id'>) => {
    try {
      const testSub: Subscription = { ...data, id: editingSubscription?.id ?? '__new__' }
      const dupes = findDuplicates([testSub], subscriptions, editingSubscription?.id)
      if (dupes.length > 0) {
        const { existing } = dupes[0]
        const confirmed = window.confirm(
          `A similar subscription already exists:\n"${existing.name}" — ${existing.currency} ${existing.price.toFixed(2)} at ${existing.domain}\n\nSave anyway?`,
        )
        if (!confirmed) return
      }
      if (editingSubscription) {
        editSubscription(editingSubscription.id, data)
        toast.success(`${data.name} updated successfully.`)
      } else {
        addSubscription(data)
        toast.success(`${data.name} added successfully.`)
      }
      setIsOpen(false)
    } catch {
      toast.error('Failed to save subscription. Please try again.')
    }
  }

  return { isOpen, editingSubscription, pendingTemplate, openEdit, openWithTemplate, close, save }
}
