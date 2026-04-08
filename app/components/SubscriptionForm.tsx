import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Switch } from '~/components/ui/switch'
import type { SubscriptionFormValues } from '~/lib/schemas'
import { cn, convertCurrency, formatDateForDisplay, getCurrencySymbol } from '~/lib/utils'
import { usePreferencesStore } from '~/store/preferences'
import { type BillingCycle, SUBSCRIPTION_CATEGORIES } from '~/store/subscriptionStore'
import { IconUrlInput } from './IconFinder'

interface SubscriptionFormProps {
  form: UseFormReturn<SubscriptionFormValues>
  rates: Record<string, number> | null
}

/**
 * Shared form fields used by both AddSubscriptionPopover and EditSubscriptionModal.
 * Handles icon, name, price/currency, domain, billing cycle, next payment date, and category.
 */
export function SubscriptionFormFields({ form, rates }: SubscriptionFormProps) {
  const { selectedCurrency } = usePreferencesStore()
  const [calendarOpen, setCalendarOpen] = useState(false)

  const {
    control,
    register,
    setValue,
    watch,
    formState: { errors },
  } = form

  const iconValue = watch('icon')
  const billingCycleValue = watch('billingCycle')
  const showNextPaymentValue = watch('showNextPayment')
  const priceValue = watch('price')
  const currencyValue = watch('currency')

  const showConversion =
    (priceValue ?? 0) > 0 && currencyValue && rates && selectedCurrency && selectedCurrency !== currencyValue

  return (
    <div className="space-y-4">
      <div>
        <IconUrlInput
          value={iconValue || ''}
          onChange={(value) => setValue('icon', value)}
          label="Icon (optional)"
          error={!!errors.icon}
        />
      </div>

      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
        <p className="text-red-500 text-xs h-4">{errors.name?.message}</p>
      </div>

      <div className="flex items-start space-x-2">
        <div className="flex-1">
          <Label htmlFor="price">Price</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
              {getCurrencySymbol(currencyValue || 'USD')}
            </span>
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  {...field}
                  onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                  className={cn('pl-7', errors.price ? 'border-red-500' : '')}
                />
              )}
            />
          </div>
          {showConversion && (
            <p className="text-xs text-muted-foreground mt-0.5">
              ≈ {convertCurrency(priceValue ?? 0, currencyValue, selectedCurrency, rates).toFixed(2)} {selectedCurrency}
            </p>
          )}
          <p className="text-red-500 text-xs h-4">{errors.price?.message}</p>
        </div>

        <div className="flex-1">
          <Label htmlFor="currency">Currency</Label>
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="currency" className={errors.currency ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(rates ?? {}).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-red-500 text-xs h-4">{errors.currency?.message}</p>
        </div>
      </div>

      <div>
        <Label htmlFor="domain">Domain</Label>
        <Input id="domain" {...register('domain')} className={errors.domain ? 'border-red-500' : ''} />
        <p className="text-red-500 text-xs h-4">{errors.domain?.message}</p>
      </div>

      <div>
        <Label htmlFor="billingCycle">Billing Cycle (optional)</Label>
        <Controller
          name="billingCycle"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
              <SelectTrigger id="billingCycle">
                <SelectValue placeholder="Select billing cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div>
        <Label htmlFor="category">Category (optional)</Label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {billingCycleValue && (
        <>
          <div className="flex items-center space-x-2">
            <Controller
              name="showNextPayment"
              control={control}
              render={({ field }) => (
                <Switch id="showNextPayment" checked={!!field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="showNextPayment" className="cursor-pointer">
              Show next payment date
            </Label>
          </div>

          {showNextPaymentValue && (
            <div>
              <Label htmlFor="nextPaymentDate">Next Payment Date</Label>
              <Controller
                name="nextPaymentDate"
                control={control}
                render={({ field }) => (
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="nextPaymentDate"
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatDateForDisplay(field.value)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => {
                          field.onChange(date?.toISOString().split('T')[0])
                          setCalendarOpen(false)
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** Infer the BillingCycle type from the form to keep manage.tsx aligned. */
export type { BillingCycle }
