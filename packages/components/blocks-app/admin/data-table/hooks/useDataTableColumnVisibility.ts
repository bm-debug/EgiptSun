import * as React from "react"
import type { VisibilityState } from "@tanstack/react-table"
import { getTableColumnVisibility } from "@/shared/utils/table-settings"

export function useDataTableColumnVisibility(
  collection: string,
  primaryRole: string | null,
  columnVisibilityKey: string
) {
  // Use useState instead of useLocalStorage to avoid SSR issues
  const [columnVisibility, setColumnVisibilityState] = React.useState<VisibilityState>(() => {
    if (typeof window === "undefined") {
      return {}
    }
    try {
      const saved = localStorage.getItem(columnVisibilityKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === "object") {
          return parsed as VisibilityState
        }
      }
    } catch {
      // Ignore parse errors
    }
    return {}
  })
  
  const setColumnVisibility = React.useCallback((value: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
    setColumnVisibilityState(value)
  }, [])

  React.useEffect(() => {
    if (!collection || typeof window === "undefined") return

    const loadColumnVisibility = async () => {
      try {
        if (primaryRole) {
          const globalVisibility = await getTableColumnVisibility(collection, primaryRole)
          if (globalVisibility && Object.keys(globalVisibility).length > 0) {
            const visibility = { ...globalVisibility }
            if (visibility.created_at === undefined) {
              visibility.created_at = false
            }
            if (visibility.updated_at === undefined) {
              visibility.updated_at = false
            }
            setColumnVisibility(visibility)
            return
          }
        }

        const saved = localStorage.getItem(columnVisibilityKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && typeof parsed === "object") {
            const visibility = parsed as VisibilityState
            if (visibility.created_at === undefined) {
              visibility.created_at = false
            }
            if (visibility.updated_at === undefined) {
              visibility.updated_at = false
            }
            setColumnVisibility(visibility)
            return
          }
        }

        setColumnVisibility({
          created_at: false,
          updated_at: false,
        })
      } catch (e) {
        console.warn("Failed to restore column visibility:", e)
        setColumnVisibility({})
      }
    }

    void loadColumnVisibility()
  }, [collection, primaryRole, columnVisibilityKey, setColumnVisibility])

  React.useEffect(() => {
    if (collection && typeof window !== "undefined" && columnVisibility) {
      try {
        localStorage.setItem(
          columnVisibilityKey,
          JSON.stringify(columnVisibility)
        )
      } catch (e) {
        console.warn("Failed to save column visibility to localStorage:", e)
      }
    }
  }, [columnVisibility, collection, columnVisibilityKey])

  return { columnVisibility, setColumnVisibility }
}
