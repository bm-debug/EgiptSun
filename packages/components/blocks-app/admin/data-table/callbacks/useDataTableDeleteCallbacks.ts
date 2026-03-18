import * as React from "react"
import type { Row } from "@tanstack/react-table"
import type { CollectionData } from "../types"

type DeleteCallbacksParams = {
  collection: string
  primaryKey: string
  recordToDelete: CollectionData | null
  setConfirmOpen: (open: boolean) => void
  setRecordToDelete: (record: CollectionData | null) => void
  setBatchDeleteOpen: (open: boolean) => void
  setBatchDeleting: (deleting: boolean) => void
  setError: (error: string | null) => void
  setRowSelection: (selection: any) => void
  fetchData: () => Promise<void>
  table: any
}

export function useDataTableDeleteCallbacks({
  collection,
  primaryKey,
  recordToDelete,
  setConfirmOpen,
  setRecordToDelete,
  setBatchDeleteOpen,
  setBatchDeleting,
  setError,
  setRowSelection,
  fetchData,
  table,
}: DeleteCallbacksParams) {
  const onDeleteRequest = React.useCallback(
    (row: Row<CollectionData>) => {
      setRecordToDelete(row.original)
      setConfirmOpen(true)
    },
    [setRecordToDelete, setConfirmOpen]
  )

  const handleConfirmDelete = React.useCallback(async (recordToDelete: CollectionData | null) => {
    if (!recordToDelete) return
    const idValue = recordToDelete[primaryKey]
    try {
      const res = await fetch(`/api/admin/${encodeURIComponent(collection)}/${encodeURIComponent(String(idValue))}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      setConfirmOpen(false)
      setRecordToDelete(null)
      await fetchData()
    } catch (e) {
      setError((e as Error).message)
    }
  }, [collection, primaryKey, setConfirmOpen, setRecordToDelete, setError, fetchData])

  const handleBatchDelete = React.useCallback(async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    if (selectedRows.length === 0) return

    setBatchDeleting(true)
    setError(null)

    try {
      for (const row of selectedRows) {
        const idValue = row.original[primaryKey]
        const res = await fetch(`/api/admin/${encodeURIComponent(collection)}/${encodeURIComponent(String(idValue))}`, {
          method: "DELETE",
          credentials: "include",
        })
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      }

      setBatchDeleteOpen(false)
      setRowSelection({})
      await fetchData()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBatchDeleting(false)
    }
  }, [collection, primaryKey, setBatchDeleting, setError, setBatchDeleteOpen, setRowSelection, fetchData, table])

  return {
    onDeleteRequest,
    handleConfirmDelete,
    handleBatchDelete,
  }
}
