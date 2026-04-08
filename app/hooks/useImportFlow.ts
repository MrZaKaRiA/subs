import type React from 'react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ImportDuplicateAction } from '~/components/ImportDuplicateDialog'
import type { Subscription } from '~/store/subscriptionStore'
import { findDuplicates } from '~/utils/duplicates'
import { type ImportValidationReport, getValidSubscriptions, validateImportData } from '~/utils/importValidation'

type DuplicatePair = { incoming: Subscription; existing: Subscription }

interface Props {
  subscriptions: Subscription[]
  replaceSubscriptions: (subs: Subscription[]) => void
}

export function useImportFlow({ subscriptions, replaceSubscriptions }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importReport, setImportReport] = useState<ImportValidationReport | null>(null)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [importDuplicates, setImportDuplicates] = useState<DuplicatePair[]>([])
  const [pendingImportSubs, setPendingImportSubs] = useState<Subscription[]>([])

  const triggerFileInput = () => fileInputRef.current?.click()

  const processValidSubs = (validSubs: Subscription[]) => {
    const dupes = findDuplicates(validSubs, subscriptions)
    if (dupes.length > 0) {
      setPendingImportSubs(validSubs)
      setImportDuplicates(dupes)
    } else {
      replaceSubscriptions(validSubs)
      toast.success(`${validSubs.length} subscription${validSubs.length !== 1 ? 's' : ''} imported successfully.`)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const report = validateImportData(content)
      if (report.invalidCount > 0) {
        setImportReport(report)
        setIsReportOpen(true)
        return
      }
      processValidSubs(getValidSubscriptions(report))
    }
    reader.readAsText(file)
  }

  const resolveDuplicates = (action: ImportDuplicateAction) => {
    const incoming = pendingImportSubs
    const dupeIds = new Set(importDuplicates.map((d) => d.incoming.id))
    const existingDupeIds = new Set(importDuplicates.map((d) => d.existing.id))
    let finalSubs: Subscription[] = []

    switch (action) {
      case 'skip': {
        const toAdd = incoming.filter((s) => !dupeIds.has(s.id))
        finalSubs = [...subscriptions, ...toAdd]
        toast.success(
          `Imported ${toAdd.length} subscriptions, skipped ${dupeIds.size} duplicate${dupeIds.size !== 1 ? 's' : ''}.`,
        )
        break
      }
      case 'keep-both': {
        const toAdd = incoming.map((s) => ({ ...s, id: crypto.randomUUID() }))
        finalSubs = [...subscriptions, ...toAdd]
        toast.success(`Imported ${toAdd.length} subscriptions (kept both).`)
        break
      }
      case 'replace': {
        const remaining = subscriptions.filter((s) => !existingDupeIds.has(s.id))
        finalSubs = [...remaining, ...incoming]
        toast.success(
          `Imported ${incoming.length} subscriptions, replaced ${existingDupeIds.size} duplicate${existingDupeIds.size !== 1 ? 's' : ''}.`,
        )
        break
      }
    }

    replaceSubscriptions(finalSubs)
    clearDuplicateState()
  }

  const importValidRows = () => {
    if (!importReport) return
    const valid = getValidSubscriptions(importReport)
    const dupes = findDuplicates(valid, subscriptions)
    if (dupes.length > 0) {
      setPendingImportSubs(valid)
      setImportDuplicates(dupes)
      closeReport()
    } else {
      replaceSubscriptions(valid)
      closeReport()
      toast.success(`${valid.length} subscription${valid.length !== 1 ? 's' : ''} imported successfully.`)
    }
  }

  const clearDuplicateState = () => {
    setImportDuplicates([])
    setPendingImportSubs([])
  }

  const closeReport = () => {
    setIsReportOpen(false)
    setImportReport(null)
  }

  return {
    fileInputRef,
    importReport,
    isReportOpen,
    importDuplicates,
    triggerFileInput,
    handleFileChange,
    resolveDuplicates,
    importValidRows,
    clearDuplicateState,
    closeReport,
  }
}
