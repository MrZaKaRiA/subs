import { AlertCircle, CheckCircle2, FileWarning } from 'lucide-react'
import type React from 'react'
import type { ImportValidationReport } from '~/utils/importValidation'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { ScrollArea } from './ui/scroll-area'

interface ImportValidationReportDialogProps {
  isOpen: boolean
  report: ImportValidationReport | null
  onClose: () => void
  onImportValid: () => void
}

const ImportValidationReportDialog: React.FC<ImportValidationReportDialogProps> = ({
  isOpen,
  report,
  onClose,
  onImportValid,
}) => {
  if (!report) return null

  const { rows, validCount, invalidCount } = report
  const hasErrors = invalidCount > 0
  const hasValid = validCount > 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5" />
            Import Validation Report
          </DialogTitle>
          <DialogDescription>
            {hasErrors
              ? `Found ${invalidCount} invalid row${invalidCount !== 1 ? 's' : ''} out of ${rows.length} total. You can import the ${validCount} valid row${validCount !== 1 ? 's' : ''} or cancel.`
              : `All ${validCount} row${validCount !== 1 ? 's' : ''} are valid and ready to import.`}
          </DialogDescription>
        </DialogHeader>

        {/* Summary badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            {validCount} valid
          </Badge>
          {hasErrors && (
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3 text-destructive" />
              {invalidCount} invalid
            </Badge>
          )}
        </div>

        {/* Row list */}
        <ScrollArea className="max-h-[360px] rounded-md border">
          <div className="divide-y">
            {rows.map((row) => {
              const label =
                row.raw && typeof row.raw === 'object' && !Array.isArray(row.raw)
                  ? (((row.raw as Record<string, unknown>).name as string | undefined) ?? `Row ${row.index + 1}`)
                  : `Row ${row.index + 1}`

              return (
                <div key={row.index} className="flex items-start gap-3 px-4 py-3">
                  <div className="mt-0.5 shrink-0">
                    {row.valid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{label}</span>
                      <Badge variant={row.valid ? 'outline' : 'destructive'} className="text-xs shrink-0">
                        {row.valid ? 'valid' : 'invalid'}
                      </Badge>
                    </div>
                    {!row.valid && (
                      <ul className="mt-1 space-y-0.5">
                        {row.errors.map((err) => (
                          <li key={err} className="text-xs text-muted-foreground">
                            &bull; {err}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onImportValid} disabled={!hasValid}>
            {hasErrors ? `Import ${validCount} valid row${validCount !== 1 ? 's' : ''}` : 'Import all'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportValidationReportDialog
