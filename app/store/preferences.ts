import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationLeadTime = 1 | 3 | 7

export interface SpendingSnapshot {
  date: string // YYYY-MM-DD
  totalMonthly: number
  currency: string
}

type PreferencesStore = {
  selectedCurrency: string
  setSelectedCurrency: (currency: string) => void
  monthlyBudget: number | null
  setMonthlyBudget: (budget: number | null) => void
  notificationsEnabled: boolean
  setNotificationsEnabled: (enabled: boolean) => void
  notificationLeadTimes: NotificationLeadTime[]
  setNotificationLeadTimes: (times: NotificationLeadTime[]) => void
  notificationDigestMode: boolean
  setNotificationDigestMode: (enabled: boolean) => void
  spendingSnapshots: SpendingSnapshot[]
  addSpendingSnapshot: (snapshot: SpendingSnapshot) => void
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      selectedCurrency: 'USD',
      setSelectedCurrency: (currency) => set({ selectedCurrency: currency }),
      monthlyBudget: null,
      setMonthlyBudget: (budget) => set({ monthlyBudget: budget }),
      notificationsEnabled: false,
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      notificationLeadTimes: [3],
      setNotificationLeadTimes: (times) => set({ notificationLeadTimes: times }),
      notificationDigestMode: false,
      setNotificationDigestMode: (enabled) => set({ notificationDigestMode: enabled }),
      spendingSnapshots: [],
      addSpendingSnapshot: (snapshot) =>
        set((state) => {
          // Keep only last 365 days, one entry per day
          const filtered = state.spendingSnapshots.filter((s) => s.date !== snapshot.date)
          const cutoff = new Date()
          cutoff.setDate(cutoff.getDate() - 365)
          const pruned = filtered.filter((s) => new Date(s.date) >= cutoff)
          return { spendingSnapshots: [...pruned, snapshot].sort((a, b) => a.date.localeCompare(b.date)) }
        }),
    }),
    {
      name: 'preferences-storage',
    },
  ),
)
