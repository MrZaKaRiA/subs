import { Check, Search, Sparkles, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { ALL_TEMPLATES, REGION_FLAGS, TEMPLATE_REGIONS } from '~/lib/templates'
import { MONTHLY_MULTIPLIER } from '~/lib/utils'
import type { Subscription, SubscriptionCategory, SubscriptionTemplate } from '~/store/subscriptionStore'

interface OnboardingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  addSubscription: (subscription: Omit<Subscription, 'id'>) => void
}

// All unique categories present in the template list, in insertion order
const TEMPLATE_CATEGORIES = Array.from(
  new Set(ALL_TEMPLATES.map((t) => t.category).filter(Boolean)),
) as SubscriptionCategory[]

function getFaviconUrl(domain: string) {
  try {
    const url = new URL(domain)
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`
  } catch {
    return undefined
  }
}

function TemplateCard({
  template,
  selected,
  onToggle,
}: {
  template: SubscriptionTemplate
  selected: boolean
  onToggle: () => void
}) {
  const faviconUrl = getFaviconUrl(template.domain)
  const monthlyEquivalent = template.price * MONTHLY_MULTIPLIER[template.billingCycle]

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all duration-150 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected
          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
          : 'border-border bg-card hover:border-muted-foreground/40'
      }`}
    >
      {/* Check badge */}
      <span
        className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full transition-all duration-150 ${
          selected ? 'bg-primary text-primary-foreground' : 'border border-muted-foreground/30 bg-background'
        }`}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>

      {/* Logo */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white p-1.5">
        {faviconUrl ? (
          <img
            src={faviconUrl}
            alt={template.name}
            width={24}
            height={24}
            className="h-6 w-6 object-contain"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <span className="text-xs font-bold text-muted-foreground">{template.name.charAt(0)}</span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 pr-6">
        <p className="truncate text-sm font-semibold leading-tight text-foreground">{template.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {template.currency}{' '}
          {monthlyEquivalent % 1 === 0 ? monthlyEquivalent.toFixed(0) : monthlyEquivalent.toFixed(2)}
          <span className="opacity-70">/mo</span>
        </p>
      </div>

      {template.region ? (
        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 shrink-0">
          {REGION_FLAGS[template.region] ?? ''} {template.region}
        </Badge>
      ) : template.category ? (
        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 shrink-0">
          {template.category}
        </Badge>
      ) : null}
    </button>
  )
}

export default function OnboardingDialog({ open, onOpenChange, addSubscription }: OnboardingDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<string>('Popular')
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      return ALL_TEMPLATES.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.label.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.region?.toLowerCase().includes(q),
      )
    }
    if (activeTab === 'Popular') return ALL_TEMPLATES.filter((t) => t.popular)
    if (activeTab === 'All') return ALL_TEMPLATES
    if (activeTab.startsWith('region:')) return ALL_TEMPLATES.filter((t) => t.region === activeTab.slice(7))
    return ALL_TEMPLATES.filter((t) => t.category === activeTab)
  }, [searchQuery, activeTab])

  const toggle = (label: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const toggleAllVisible = () => {
    const allSelected = filtered.every((t) => selected.has(t.label))
    setSelected((prev) => {
      const next = new Set(prev)
      for (const t of filtered) {
        if (allSelected) next.delete(t.label)
        else next.add(t.label)
      }
      return next
    })
  }

  const selectedTemplates = ALL_TEMPLATES.filter((t) => selected.has(t.label))

  const totalMonthly = selectedTemplates.reduce((sum, t) => sum + t.price * MONTHLY_MULTIPLIER[t.billingCycle], 0)

  const handleAdd = () => {
    for (const t of selectedTemplates) {
      addSubscription({
        name: t.name,
        price: t.price,
        currency: t.currency,
        domain: t.domain,
        billingCycle: t.billingCycle,
        category: t.category,
      })
    }
    setSelected(new Set())
    onOpenChange(false)
  }

  const handleClose = () => {
    onOpenChange(false)
    setSelected(new Set())
    setSearchQuery('')
    setActiveTab('Popular')
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.label))

  const categoryTabs: Array<{ id: string; label: string }> = [
    { id: 'Popular', label: '⭐ Popular' },
    { id: 'All', label: 'All' },
    ...TEMPLATE_CATEGORIES.map((c) => ({ id: c, label: c })),
  ]

  const regionTabs: Array<{ id: string; label: string }> = TEMPLATE_REGIONS.map((r) => ({
    id: `region:${r}`,
    label: `${REGION_FLAGS[r] ?? ''} ${r}`,
  }))

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose()
        else onOpenChange(true)
      }}
    >
      <DialogContent className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="shrink-0 border-b px-6 py-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle className="text-xl">Quick Setup</DialogTitle>
          </div>
          <DialogDescription className="mt-1">
            Select the services you already subscribe to — we'll add them all at once.
          </DialogDescription>

          {/* Search input */}
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services, categories, or countries…"
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  searchRef.current?.focus()
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Tab filter */}
        <div className="shrink-0 border-b">
          {/* Category row */}
          <div className="flex flex-wrap gap-1.5 px-6 pt-3 pb-2">
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  setSearchQuery('')
                }}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeTab === tab.id && !searchQuery
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Country row */}
          <div className="flex flex-wrap gap-1.5 px-6 pb-3">
            {regionTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  setSearchQuery('')
                }}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeTab === tab.id && !searchQuery
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {searchQuery.trim()
                ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${searchQuery.trim()}"`
                : `${filtered.length} service${filtered.length !== 1 ? 's' : ''}`}
            </p>
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={toggleAllVisible}
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                {allVisibleSelected ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No services found</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Try a different search term or browse by category</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs text-primary underline-offset-2 hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((template) => (
                <TemplateCard
                  key={template.label}
                  template={template}
                  selected={selected.has(template.label)}
                  onToggle={() => toggle(template.label)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t bg-muted/30 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              {selected.size > 0 ? (
                <>
                  <p className="text-sm font-semibold text-foreground">
                    {selected.size} service{selected.size !== 1 ? 's' : ''} selected
                  </p>
                  <p className="text-xs text-muted-foreground">≈ ${totalMonthly.toFixed(2)}/mo total</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No services selected yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button disabled={selected.size === 0} onClick={handleAdd}>
                <Check className="mr-1.5 h-4 w-4" />
                Add {selected.size > 0 ? selected.size : ''} subscription{selected.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
