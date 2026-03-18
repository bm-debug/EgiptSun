import * as React from "react"
import type { ColumnFilterValues } from "../types"

export function useDataTableColumnFilterValues(collection: string) {
  const [columnFilterValues, setColumnFilterValues] = React.useState<ColumnFilterValues>(() => {
    if (typeof window !== "undefined" && collection) {
      try {
        const saved = localStorage.getItem(`column-filter-values-${collection}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && typeof parsed === "object") {
            return parsed as ColumnFilterValues
          }
        }
      } catch (e) {
        console.warn("Failed to restore column filter values from localStorage:", e)
      }
    }
    return {}
  })

  // Restore column filter values when collection changes
  React.useEffect(() => {
    if (!collection || typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(`column-filter-values-${collection}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === "object") {
          setColumnFilterValues(parsed as ColumnFilterValues)
        } else {
          setColumnFilterValues({})
        }
      } else {
        setColumnFilterValues({})
      }
    } catch (e) {
      console.warn("Failed to restore column filter values:", e)
      setColumnFilterValues({})
    }
  }, [collection])

  // Save column filter values to localStorage when they change
  React.useEffect(() => {
    if (collection && typeof window !== "undefined") {
      try {
        localStorage.setItem(`column-filter-values-${collection}`, JSON.stringify(columnFilterValues))
      } catch (e) {
        console.warn("Failed to save column filter values to localStorage:", e)
      }
    }
  }, [columnFilterValues, collection])

  return { columnFilterValues, setColumnFilterValues }
}
