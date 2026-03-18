import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import type { CollectionData } from "../types"

type ReorderedColumnsParams = {
  columns: ColumnDef<CollectionData>[]
  columnOrder: string[]
  isMobile: boolean
  collection: string
}

export function useDataTableReorderedColumns({
  columns,
  columnOrder,
  isMobile,
  collection,
}: ReorderedColumnsParams) {
  return React.useMemo(() => {
    // Always start with all columns
    const allColumnsMap = new Map(columns.map((col) => [col.id, col]))

    // Apply saved column order if available
    if (columnOrder.length > 0) {
      const orderedColumns: ColumnDef<CollectionData>[] = []
      const unorderedColumns: ColumnDef<CollectionData>[] = []
      const processedIds = new Set<string>()

      // Add columns in saved order (only if they exist in current columns)
      for (const columnId of columnOrder) {
        const col = allColumnsMap.get(columnId)
        if (col && col.id) {
          // Skip select and actions columns - they have fixed positions
          if (col.id !== "select" && col.id !== "actions") {
            orderedColumns.push(col)
            processedIds.add(col.id)
          }
        }
      }

      // Add remaining columns that weren't in the saved order
      allColumnsMap.forEach((col) => {
        const colId = col.id
        if (colId && colId !== "select" && colId !== "actions" && !processedIds.has(colId)) {
          unorderedColumns.push(col)
        }
      })

      // For mobile, keep actions and select at the beginning
      if (isMobile) {
        const selectColumn = allColumnsMap.get("select")
        const actionsColumn = allColumnsMap.get("actions")
        const result: ColumnDef<CollectionData>[] = []
        if (actionsColumn) result.push(actionsColumn)
        if (selectColumn) result.push(selectColumn)
        result.push(...orderedColumns, ...unorderedColumns)
        return result
      }
      // For desktop, keep select at the beginning, actions at the end
      const selectColumn = allColumnsMap.get("select")
      const actionsColumn = allColumnsMap.get("actions")
      const result: ColumnDef<CollectionData>[] = []
      if (selectColumn) result.push(selectColumn)
      result.push(...orderedColumns, ...unorderedColumns)
      if (actionsColumn) result.push(actionsColumn)
      return result
    }

    // No saved order - use default reordering
    let otherColumns = columns.filter((col) => col.id !== "select" && col.id !== "actions")

    // For contractors, set default column order
    if (collection === "contractors") {
      const defaultOrder = ["id", "media_id", "title", "reg", "tin", "status_name", "city_name"]
      const ordered: ColumnDef<CollectionData>[] = []
      const unordered: ColumnDef<CollectionData>[] = []
      const processedIds = new Set<string>()

      // Add columns in default order
      for (const colId of defaultOrder) {
        const col = otherColumns.find((c) => c.id === colId)
        if (col && col.id) {
          ordered.push(col)
          processedIds.add(col.id)
        }
      }

      // Add remaining columns
      otherColumns.forEach((col) => {
        if (col.id && !processedIds.has(col.id)) {
          unordered.push(col)
        }
      })

      otherColumns = [...ordered, ...unordered]
    }

    if (isMobile) {
      const selectColumn = allColumnsMap.get("select")
      const actionsColumn = allColumnsMap.get("actions")
      const result: ColumnDef<CollectionData>[] = []
      if (actionsColumn) result.push(actionsColumn)
      if (selectColumn) result.push(selectColumn)
      result.push(...otherColumns)
      return result
    }

    // Desktop: select first, actions last
    const selectColumn = allColumnsMap.get("select")
    const actionsColumn = allColumnsMap.get("actions")
    const desktopColumns = columns.filter((col) => col.id !== "select" && col.id !== "actions")
    const result: ColumnDef<CollectionData>[] = []
    if (selectColumn) result.push(selectColumn)
    result.push(...desktopColumns)
    if (actionsColumn) result.push(actionsColumn)
    return result
  }, [columns, columnOrder, isMobile, collection])
}
