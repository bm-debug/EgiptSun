import * as React from "react"
import type { ColumnAlignment } from "../types"

export function useDataTableColumnAlignment(collection: string) {
  const [columnAlignment, setColumnAlignment] = React.useState<ColumnAlignment>(() => {
    if (typeof window !== "undefined" && collection) {
      try {
        const saved = localStorage.getItem(`column-alignment-${collection}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && typeof parsed === "object") {
            return parsed as ColumnAlignment
          }
        }
      } catch (e) {
        console.warn("Failed to restore column alignment from localStorage:", e)
      }
    }
    return {}
  })

  // Restore column alignment when collection changes
  React.useEffect(() => {
    if (!collection || typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(`column-alignment-${collection}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === "object") {
          setColumnAlignment(parsed as ColumnAlignment)
        } else {
          setColumnAlignment({})
        }
      } else {
        setColumnAlignment({})
      }
    } catch (e) {
      console.warn("Failed to restore column alignment:", e)
      setColumnAlignment({})
    }
  }, [collection])

  // Save column alignment to localStorage when it changes
  React.useEffect(() => {
    if (collection && typeof window !== "undefined") {
      try {
        localStorage.setItem(`column-alignment-${collection}`, JSON.stringify(columnAlignment))
      } catch (e) {
        console.warn("Failed to save column alignment to localStorage:", e)
      }
    }
  }, [columnAlignment, collection])

  return { columnAlignment, setColumnAlignment }
}
