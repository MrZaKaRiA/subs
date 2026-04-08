import { Search, X } from 'lucide-react'
import { forwardRef } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

interface SearchBarProps {
  query: string
  onSearch: (query: string) => void
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(({ query, onSearch }, ref) => {
  return (
    <div className="relative rounded-lg bg-card">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref}
        type="text"
        placeholder="Search subscriptions..."
        className="pl-10 pr-24 py-2 w-full"
        value={query}
        onChange={(e) => onSearch(e.target.value)}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {query.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onSearch('')}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">/</span>
      </div>
    </div>
  )
})

SearchBar.displayName = 'SearchBar'

export default SearchBar
