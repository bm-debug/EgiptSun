import * as React from "react"
import type { ImportFormat } from "@/shared/utils/table-import"

type ImportMode = "file" | "paste"

type ImportProgress = {
  imported: number
  total: number
}

type ImportResult = {
  success: boolean
  imported: number
  errors: string[]
}

export function useDataTableImportState() {
  const [importOpen, setImportOpen] = React.useState(false)
  const [importFormat, setImportFormat] = React.useState<ImportFormat>("csv")
  const [importFile, setImportFile] = React.useState<File | null>(null)
  const [importText, setImportText] = React.useState<string>("")
  const [importMode, setImportMode] = React.useState<ImportMode>("file")
  const [importProgress, setImportProgress] = React.useState<ImportProgress>({ imported: 0, total: 0 })
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null)
  const [importing, setImporting] = React.useState(false)

  return {
    importOpen,
    setImportOpen,
    importFormat,
    setImportFormat,
    importFile,
    setImportFile,
    importText,
    setImportText,
    importMode,
    setImportMode,
    importProgress,
    setImportProgress,
    importResult,
    setImportResult,
    importing,
    setImporting,
  }
}
