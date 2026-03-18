import * as React from "react"
import type { CollectionData } from "../types"

export function useDataTableDeleteState() {
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [recordToDelete, setRecordToDelete] = React.useState<CollectionData | null>(null)
  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false)
  const [batchDeleting, setBatchDeleting] = React.useState(false)

  return {
    confirmOpen,
    setConfirmOpen,
    recordToDelete,
    setRecordToDelete,
    batchDeleteOpen,
    setBatchDeleteOpen,
    batchDeleting,
    setBatchDeleting,
  }
}
