import * as React from "react"

export function useDataTableEditingState(collection: string) {
  const [editMode, setEditMode] = React.useState<boolean>(() => {
    if (typeof window !== "undefined" && collection) {
      try {
        const saved = localStorage.getItem(`edit-mode-${collection}`)
        if (saved !== null) {
          return JSON.parse(saved)
        }
      } catch (e) {
        // Ignore
      }
    }
    return false
  })

  const [editedCells, setEditedCells] = React.useState<Map<string, Record<string, any>>>(() => new Map())

  const [rowSelection, setRowSelection] = React.useState({})

  const hasUnsavedChanges = editedCells.size > 0

  return {
    editMode,
    setEditMode,
    editedCells,
    setEditedCells,
    rowSelection,
    setRowSelection,
    hasUnsavedChanges,
  }
}
