import { ArrowUpDown, Filter, SlidersHorizontal } from 'lucide-react'
import type React from 'react'
import SearchBar from '~/components/SearchBar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import type { CycleOption, SortOption } from '~/hooks/useFilterState'
import { SUBSCRIPTION_CATEGORIES } from '~/store/subscriptionStore'

interface FilterBarProps {
  searchBarRef: React.RefObject<HTMLInputElement>
  searchQuery: string
  onSearch: (q: string) => void
  sortBy: SortOption
  onSortChange: (v: SortOption) => void
  billingCycleFilter: CycleOption
  onBillingCycleChange: (v: CycleOption) => void
  categoryFilter: string
  onCategoryChange: (v: string) => void
  filteredCount: number
  totalCount: number
  hasActiveFilters: boolean
  onClearFilters: () => void
}

export function FilterBar({
  searchBarRef,
  searchQuery,
  onSearch,
  sortBy,
  onSortChange,
  billingCycleFilter,
  onBillingCycleChange,
  categoryFilter,
  onCategoryChange,
  filteredCount,
  totalCount,
  hasActiveFilters,
  onClearFilters,
}: FilterBarProps) {
  const cycleLabel = billingCycleFilter.charAt(0).toUpperCase() + billingCycleFilter.slice(1)

  return (
    <>
      <div className="mb-3 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3">
        <SearchBar query={searchQuery} ref={searchBarRef} onSearch={onSearch} />
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-full lg:w-[220px]">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="price-desc">Price (High to low)</SelectItem>
            <SelectItem value="price-asc">Price (Low to high)</SelectItem>
            <SelectItem value="next-payment">Next payment (Soonest)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={billingCycleFilter} onValueChange={(v) => onBillingCycleChange(v as CycleOption)}>
          <SelectTrigger className="w-full lg:w-[200px]">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Billing cycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All billing cycles</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full lg:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {SUBSCRIPTION_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          Showing {filteredCount} of {totalCount}
        </Badge>
        {searchQuery.trim().length > 0 && <Badge variant="outline">Search: {searchQuery}</Badge>}
        {billingCycleFilter !== 'all' && <Badge variant="outline">Cycle: {cycleLabel}</Badge>}
        {categoryFilter !== 'all' && <Badge variant="outline">Category: {categoryFilter}</Badge>}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Reset view
          </Button>
        )}
      </div>
    </>
  )
}
