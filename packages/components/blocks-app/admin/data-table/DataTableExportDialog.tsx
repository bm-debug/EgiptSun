import * as React from "react"
import type { Table } from "@tanstack/react-table"
import type { ExportFormat } from "@/shared/utils/table-export"
import { IconCopy, IconDownload } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogClose,
} from "@/packages/components/ui/revola"
import { defaultT } from "./default-t"
import type { CollectionData } from "./types"

type DataTableTranslations = typeof defaultT

type DataTableExportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  t: DataTableTranslations
  table: Table<CollectionData>
  exportFormat: ExportFormat
  exportData: string
  exportCopied: boolean
  onCopy: () => void
  onDownload: () => void
}

export function DataTableExportDialog({
  open,
  onOpenChange,
  t,
  table,
  exportFormat,
  exportData,
  exportCopied,
  onCopy,
  onDownload,
}: DataTableExportDialogProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <ResponsiveDialogHeader className="px-6 pt-6 pb-4">
          <ResponsiveDialogTitle>{t.exportData}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {(t.exportedRecords || "Exported {count} records in {format} format")
              .replace("{count}", String(table.getFilteredRowModel().rows.length))
              .replace("{format}", exportFormat.toUpperCase())}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
          <Textarea
            value={exportData}
            readOnly
            className="font-mono text-sm min-h-[300px] resize-none w-full"
            style={{ whiteSpace: exportFormat === "json" ? "pre" : "pre-wrap" }}
          />
        </div>
        <ResponsiveDialogFooter className="shrink-0 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.close}
          </Button>
          <Button variant="outline" onClick={onCopy}>
            <IconCopy className="mr-2 h-4 w-4" />
            {exportCopied ? t.copied : t.copy}
          </Button>
          <Button onClick={onDownload}>
            <IconDownload className="mr-2 h-4 w-4" />
            {t.downloadFile}
          </Button>
        </ResponsiveDialogFooter>
        <ResponsiveDialogClose className="sr-only" />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
