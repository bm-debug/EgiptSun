import * as React from "react"
import type { ImportFormat } from "@/shared/utils/table-import"
import { IconCheck, IconLoader, IconUpload, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/packages/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

type DataTableTranslations = typeof defaultT

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

type DataTableImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  t: DataTableTranslations
  collection: string
  importFormat: ImportFormat
  setImportFormat: (format: ImportFormat) => void
  importMode: ImportMode
  setImportMode: (mode: ImportMode) => void
  importFile: File | null
  setImportFile: (file: File | null) => void
  importText: string
  setImportText: (value: string) => void
  importing: boolean
  importProgress: ImportProgress
  importResult: ImportResult | null
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
  onClose: () => void
  onImport: () => void
}

export function DataTableImportDialog({
  open,
  onOpenChange,
  t,
  collection,
  importFormat,
  setImportFormat,
  importMode,
  setImportMode,
  importFile,
  setImportFile,
  importText,
  setImportText,
  importing,
  importProgress,
  importResult,
  onFileSelect,
  onClose,
  onImport,
}: DataTableImportDialogProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <ResponsiveDialogHeader className="px-6 pt-6 pb-4">
          <ResponsiveDialogTitle>{t.importData}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {(t.importDescription || "Load a file or paste data to import into {collection} collection").replace(
              "{collection}",
              collection
            )}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex-1 overflow-auto min-h-0 px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-start">{t.fileFormat}</Label>
            <Select
              value={importFormat}
              onValueChange={(value) => {
                const newFormat = value as ImportFormat
                setImportFormat(newFormat)
                setImportFile(null)
                setImportText("")
                if (newFormat === "xls") {
                  setImportMode("file")
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xls">Excel (XLS)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="sql">SQL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(importFormat === "csv" || importFormat === "json" || importFormat === "sql") && (
            <div className="space-y-2">
              <Label className="text-start">{t.importMode}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={importMode === "file" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImportMode("file")}
                  disabled={importing}
                >
                  {t.loadFile}
                </Button>
                <Button
                  type="button"
                  variant={importMode === "paste" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImportMode("paste")}
                  disabled={importing}
                >
                  {t.pasteText}
                </Button>
              </div>
            </div>
          )}
          {importMode === "file" ? (
            <div className="space-y-2">
              <Label className="text-start">{t.file}</Label>
              <Input
                type="file"
                accept={
                  importFormat === "csv"
                    ? ".csv"
                    : importFormat === "xls"
                      ? ".xls,.xlsx"
                      : importFormat === "json"
                        ? ".json"
                        : ".sql"
                }
                onChange={onFileSelect}
                disabled={importing}
              />
              {importFile && (
                <p className="text-sm text-muted-foreground">
                  {(t.selectedFile || "Selected file: {name} ({size} KB)")
                    .replace("{name}", importFile.name)
                    .replace("{size}", (importFile.size / 1024).toFixed(2))}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-start">{t.pasteData}</Label>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={(t.pasteDataPlaceholder || "Paste data in {format} format...").replace(
                  "{format}",
                  importFormat.toUpperCase()
                )}
                className="font-mono text-sm min-h-[300px] resize-none"
                disabled={importing}
                style={{ whiteSpace: importFormat === "json" ? "pre" : "pre-wrap" }}
              />
            </div>
          )}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t.importing}</span>
                <span>
                  {importProgress.imported} / {importProgress.total}
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${
                      importProgress.total > 0
                        ? (importProgress.imported / importProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
          {importResult && (
            <div
              className={`rounded-lg border p-4 ${
                importResult.success
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : "border-destructive bg-destructive/10"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {importResult.success ? (
                  <IconCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <IconX className="h-5 w-5 text-destructive" />
                )}
                <span
                  className={`font-semibold ${
                    importResult.success ? "text-green-700 dark:text-green-400" : "text-destructive"
                  }`}
                >
                  {(t.importedRecords || "Imported: {count} records").replace(
                    "{count}",
                    String(importResult.imported)
                  )}
                </span>
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-semibold text-destructive">{t.errors}</p>
                  <ul className="text-sm text-destructive list-disc list-inside space-y-1 max-h-40 overflow-y-auto">
                    {importResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <ResponsiveDialogFooter className="shrink-0 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={importing}>
            {importResult ? t.close : t.form?.cancel}
          </Button>
          <Button
            onClick={onImport}
            disabled={
              (importMode === "file" && !importFile) ||
              (importMode === "paste" && !importText.trim()) ||
              importing
            }
          >
            {importing ? (
              <>
                <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                {t.importing}
              </>
            ) : (
              <>
                <IconUpload className="mr-2 h-4 w-4" />
                {t.importButton}
              </>
            )}
          </Button>
        </ResponsiveDialogFooter>
        <ResponsiveDialogClose className="sr-only" />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
