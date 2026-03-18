import * as React from "react"
import type { ColumnSchemaExtended } from "../types"

type EditingCallbacksParams = {
  schema: ColumnSchemaExtended[]
  collection: string
  editedCells: Map<string, Record<string, any>>
  setEditedCells: (updater: (prev: Map<string, Record<string, any>>) => Map<string, Record<string, any>>) => void
  fetchData: () => Promise<void>
  recordToEdit: any
  table: any
  primaryKey: string
  onEditRequest: (row: any) => void
}

export function useDataTableEditingCallbacks({
  schema,
  collection,
  editedCells,
  setEditedCells,
  fetchData,
  recordToEdit,
  table,
  primaryKey,
  onEditRequest,
}: EditingCallbacksParams) {
  const handleCellUpdate = React.useCallback(
    (rowId: string | number, fieldName: string, value: any) => {
      const rowIdStr = String(rowId)
      setEditedCells((prev) => {
        const newMap = new Map(prev)
        const rowChanges = newMap.get(rowIdStr) || {}

        const field = schema.find((f) => f.name === fieldName)
        let processedValue = value

        if (field) {
          if (field.fieldType === "price" && typeof value === "number") {
            processedValue = value
          } else if (field.fieldType === "boolean") {
            processedValue = value === true || value === "true" || value === 1 || value === "1"
          } else if (value instanceof Date) {
            processedValue = value.toISOString()
          } else if (field.fieldType === "json" && value != null && typeof value === "object") {
            processedValue = value
          } else {
            processedValue = value
          }
        }

        rowChanges[fieldName] = processedValue
        newMap.set(rowIdStr, rowChanges)
        return newMap
      })
    },
    [schema, setEditedCells]
  )

  const handleSaveAllChanges = React.useCallback(async () => {
    if (editedCells.size === 0) return

    try {
      const primaryKeyField = schema.find((f) => f.primary)?.name || "id"

      const promises = Array.from(editedCells.entries()).map(async ([rowIdStr, changes]) => {
        const rowId = rowIdStr
        const payload: Record<string, any> = {}

        for (const [fieldName, value] of Object.entries(changes)) {
          if (fieldName === "data_in") {
            payload.data_in = value
          } else {
            const field = schema.find((f) => f.name === fieldName)
            if (field) {
              if (field.fieldType === "price" && typeof value === "number") {
                payload[fieldName] = value
              } else if (field.fieldType === "boolean") {
                payload[fieldName] = value === true || value === "true" || value === 1 || value === "1"
              } else if (value instanceof Date) {
                payload[fieldName] = value.toISOString()
              } else if (field.fieldType === "json" && value != null && typeof value === "object") {
                payload[fieldName] = value
              } else {
                payload[fieldName] = value
              }
            } else {
              payload[fieldName] = value
            }
          }
        }

        const res = await fetch(`/api/admin/${encodeURIComponent(collection)}/${encodeURIComponent(String(rowId))}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const json = await res.json() as { error?: string }
          throw new Error(json.error || `Update failed for row ${rowId}: ${res.status}`)
        }
      })

      await Promise.all(promises)

      setEditedCells(() => new Map())
      await fetchData()
    } catch (e) {
      console.error("Failed to save changes:", e)
      throw e
    }
  }, [editedCells, schema, collection, setEditedCells, fetchData])

  const currentRowIndex = React.useMemo(() => {
    if (!recordToEdit || !table) return -1
    const pkValue = recordToEdit[primaryKey]
    const rows = table.getRowModel().rows
    return rows.findIndex((row: any) => row.original[primaryKey] === pkValue)
  }, [recordToEdit, table, primaryKey])

  const hasPreviousRecord = currentRowIndex > 0
  const hasNextRecord = currentRowIndex >= 0 && currentRowIndex < (table?.getRowModel().rows.length || 0) - 1

  const navigateToPrevious = React.useCallback(() => {
    if (!hasPreviousRecord || !table) return
    const rows = table.getRowModel().rows
    const previousRow = rows[currentRowIndex - 1]
    if (previousRow) {
      onEditRequest(previousRow)
    }
  }, [hasPreviousRecord, currentRowIndex, table, onEditRequest])

  const navigateToNext = React.useCallback(() => {
    if (!hasNextRecord || !table) return
    const rows = table.getRowModel().rows
    const nextRow = rows[currentRowIndex + 1]
    if (nextRow) {
      onEditRequest(nextRow)
    }
  }, [hasNextRecord, currentRowIndex, table, onEditRequest])

  return {
    handleCellUpdate,
    handleSaveAllChanges,
    currentRowIndex,
    hasPreviousRecord,
    hasNextRecord,
    navigateToPrevious,
    navigateToNext,
  }
}
