import * as React from "react"
import type { Table } from "@tanstack/react-table"
import type { ExportFormat } from "@/shared/utils/table-export"
import { exportTable, getFileExtension, getMimeType, addBOM } from "@/shared/utils/table-export"
import type { CollectionData, ColumnSchemaExtended } from "../types"
import type { VisibilityState } from "@tanstack/react-table"

type ExportCallbacksParams = {
  collection: string
  table: Table<CollectionData>
  schema: ColumnSchemaExtended[]
  columnVisibility: VisibilityState
  locale: string
  relationData: Record<string, Record<any, string>>
  translations: any
  exportData: string
  exportFormat: ExportFormat
  setExportData: (data: string) => void
  setExportFormat: (format: ExportFormat) => void
  setExportOpen: (open: boolean) => void
  setExportCopied: (copied: boolean) => void
}

export function useDataTableExportCallbacks({
  collection,
  table,
  schema,
  columnVisibility,
  locale,
  relationData,
  translations,
  exportData,
  exportFormat,
  setExportData,
  setExportFormat,
  setExportOpen,
  setExportCopied,
}: ExportCallbacksParams) {
  const handleExport = React.useCallback(
    (format: ExportFormat) => {
      const rows = table.getFilteredRowModel().rows

      const columnOrder = table
        .getAllColumns()
        .filter((col) => col.getIsVisible() && col.id !== "select")
        .map((col) => col.id)

      const exported = exportTable({
        collection: collection || "",
        format,
        rows,
        columns: schema,
        visibleColumns: columnVisibility,
        locale,
        relationData,
        columnOrder,
        translations,
      })

      setExportData(exported)
      setExportFormat(format)
      setExportOpen(true)
      setExportCopied(false)
    },
    [table, collection, schema, columnVisibility, locale, relationData, translations, setExportData, setExportFormat, setExportOpen, setExportCopied]
  )

  const handleExportCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportData)
      setExportCopied(true)
      setTimeout(() => setExportCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [exportData, setExportCopied])

  const handleExportDownload = React.useCallback(() => {
    const dataToDownload = exportFormat === "csv" || exportFormat === "xls" ? addBOM(exportData) : exportData
    const blob = new Blob([dataToDownload], { type: getMimeType(exportFormat) })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${collection || "export"}_${new Date().toISOString().split("T")[0]}.${getFileExtension(exportFormat)}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [exportData, exportFormat, collection])

  return {
    handleExport,
    handleExportCopy,
    handleExportDownload,
  }
}
