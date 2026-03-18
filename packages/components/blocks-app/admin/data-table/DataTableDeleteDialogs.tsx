import * as React from "react"
import { IconLoader } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/packages/components/ui/revola"
import type { Table } from "@tanstack/react-table"
import type { CollectionData } from "./types"

type DataTableDeleteDialogsProps = {
  t: any
  collectionLabel: string
  confirmOpen: boolean
  setConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>
  handleConfirmDelete: () => void
  batchDeleteOpen: boolean
  setBatchDeleteOpen: React.Dispatch<React.SetStateAction<boolean>>
  handleBatchDelete: () => void
  batchDeleting: boolean
  table: Table<CollectionData>
}

export function DataTableDeleteDialogs({
  t,
  collectionLabel,
  confirmOpen,
  setConfirmOpen,
  handleConfirmDelete,
  batchDeleteOpen,
  setBatchDeleteOpen,
  handleBatchDelete,
  batchDeleting,
  table,
}: DataTableDeleteDialogsProps) {
  return (
    <>
      <ResponsiveDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <ResponsiveDialogContent className="p-6">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t.delete?.deleteRecord?.title || "Delete record?"}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {(t.delete?.deleteRecord?.description || "This action cannot be undone. You are about to delete one record from \"{collection}\".").replace("{collection}", collectionLabel)}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>{t.form?.cancel || "Cancel"}</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>{t.delete?.delete || "Delete"}</Button>
          </ResponsiveDialogFooter>
          <ResponsiveDialogClose className="sr-only" />
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <ResponsiveDialogContent className="p-6">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t.delete?.deleteSelected?.title || "Delete selected records?"}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {(t.delete?.deleteSelected?.description || "This action cannot be undone. You are about to delete {count} records from \"{collection}\".")
                .replace("{count}", String(table.getFilteredSelectedRowModel().rows.length))
                .replace("{collection}", collectionLabel)}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setBatchDeleteOpen(false)} disabled={batchDeleting}>{t.form?.cancel || "Cancel"}</Button>
            <Button variant="destructive" onClick={handleBatchDelete} disabled={batchDeleting}>
              {batchDeleting ? (
                <>
                  <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                  {t.delete?.deleteSelected?.deleting || "Deleting..."}
                </>
              ) : (
                t.delete?.deleteSelected?.deleteAll || "Delete All"
              )}
            </Button>
          </ResponsiveDialogFooter>
          <ResponsiveDialogClose className="sr-only" />
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}
