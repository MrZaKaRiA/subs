import { AlertTriangle } from 'lucide-react'
import { Progress } from '~/components/ui/progress'

interface BudgetProgressProps {
  total: number
  budget: number
  currency: string
}

/**
 * Displays a budget progress bar with warning/over-budget states.
 * Used in both Summary and Insights pages.
 */
export function BudgetProgress({ total, budget, currency }: BudgetProgressProps) {
  if (budget <= 0) return null

  const percent = Math.min((total / budget) * 100, 100)
  const isOverBudget = total > budget
  const isWarning = percent >= 80

  const textColor = isOverBudget ? 'text-destructive' : isWarning ? 'text-yellow-600' : 'text-foreground'
  const barClass = isOverBudget ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-yellow-500' : ''

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          Monthly budget
          {(isWarning || isOverBudget) && (
            <AlertTriangle className={`h-3 w-3 ${isOverBudget ? 'text-destructive' : 'text-yellow-500'}`} />
          )}
        </span>
        <span className={`text-sm font-semibold ${textColor}`}>
          {total.toFixed(2)} / {budget.toFixed(2)} {currency}
          {isOverBudget && ' — Over budget!'}
          {!isOverBudget && isWarning && ` — ${percent.toFixed(0)}% used`}
        </span>
      </div>
      <Progress value={percent} className={`h-2 ${barClass}`} />
    </div>
  )
}
