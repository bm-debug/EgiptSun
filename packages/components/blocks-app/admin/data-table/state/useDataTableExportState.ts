import * as React from "react"
import type { ExportFormat } from "@/shared/utils/table-export"

export function useDataTableExportState() {
  const [exportOpen, setExportOpen] = React.useState(false)
  const [exportFormat, setExportFormat] = React.useState<ExportFormat>("csv")
  const [exportData, setExportData] = React.useState<string>("")
  const [exportCopied, setExportCopied] = React.useState(false)

  return {
    exportOpen,
    setExportOpen,
    exportFormat,
    setExportFormat,
    exportData,
    setExportData,
    exportCopied,
    setExportCopied,
  }
}
