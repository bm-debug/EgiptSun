import * as React from "react"
import type { ImportFormat } from "@/shared/utils/table-import"
import { parseImportFile, importRows } from "@/shared/utils/table-import"
import type { CollectionData } from "../types"

type ImportCallbacksParams = {
  collection: string
  importFile: File | null
  importText: string
  importMode: "file" | "paste"
  importFormat: ImportFormat
  setImporting: (importing: boolean) => void
  setImportProgress: (progress: { imported: number; total: number }) => void
  setImportResult: (result: { success: boolean; imported: number; errors: string[] } | null) => void
  setImportOpen: (open: boolean) => void
  setImportFile: (file: File | null) => void
  setImportText: (text: string) => void
  setImportMode: (mode: "file" | "paste") => void
  setImportFormat: (format: ImportFormat) => void
  fetchData: () => Promise<void>
  t: any
}

export function useDataTableImportCallbacks({
  collection,
  importFile,
  importText,
  importMode,
  importFormat,
  setImporting,
  setImportProgress,
  setImportResult,
  setImportOpen,
  setImportFile,
  setImportText,
  setImportMode,
  setImportFormat,
  fetchData,
  t,
}: ImportCallbacksParams) {
  const handleImportFileSelect = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setImportFile(file)
      const ext = file.name.split(".").pop()?.toLowerCase()
      if (ext === "csv") {
        setImportFormat("csv")
      } else if (ext === "xls" || ext === "xlsx") {
        setImportFormat("xls")
      } else if (ext === "json") {
        setImportFormat("json")
      } else if (ext === "sql") {
        setImportFormat("sql")
      }
    },
    [setImportFile, setImportFormat]
  )

  const handleImport = React.useCallback(async () => {
    if (!collection) return
    if (importMode === "file" && !importFile) return
    if (importMode === "paste" && !importText.trim()) return

    setImporting(true)
    setImportResult(null)
    setImportProgress({ imported: 0, total: 0 })

    try {
      const content = importMode === "file" ? await importFile!.text() : importText
      const rows = parseImportFile(content, importFormat, collection)

      if (rows.length === 0) {
        setImportResult({
          success: false,
          imported: 0,
          errors: [t.importNoData],
        })
        setImporting(false)
        return
      }

      setImportProgress({ imported: 0, total: rows.length })

      const result = await importRows(collection, rows, (imported, total) => setImportProgress({ imported, total }))

      setImportResult(result)

      if (result.success || result.imported > 0) {
        await fetchData()
      }
    } catch (e) {
      setImportResult({
        success: false,
        imported: 0,
        errors: [e instanceof Error ? e.message : t.importError],
      })
    } finally {
      setImporting(false)
    }
  }, [collection, importFile, importText, importMode, importFormat, setImporting, setImportProgress, setImportResult, fetchData, t])

  const handleImportClose = React.useCallback(() => {
    setImportOpen(false)
    setImportFile(null)
    setImportText("")
    setImportMode("file")
    setImportResult(null)
    setImportProgress({ imported: 0, total: 0 })
    setImporting(false)
  }, [setImportOpen, setImportFile, setImportText, setImportMode, setImportResult, setImportProgress, setImporting])

  const handleImportDialogChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setImportOpen(false)
        setImportFile(null)
        setImportText("")
        setImportMode("file")
        setImportResult(null)
        setImportProgress({ imported: 0, total: 0 })
        setImporting(false)
      } else {
        setImportOpen(true)
      }
    },
    [setImportOpen, setImportFile, setImportText, setImportMode, setImportResult, setImportProgress, setImporting]
  )

  return {
    handleImportFileSelect,
    handleImport,
    handleImportClose,
    handleImportDialogChange,
  }
}
