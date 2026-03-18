import * as React from "react"

export function useDataTableColumnSizing(collection: string, columnSizesKey: string) {
  // Use useState instead of useLocalStorage to avoid SSR issues
  const [columnSizing, setColumnSizingState] = React.useState<Record<string, number>>(() => {
    if (typeof window === "undefined") {
      return {}
    }
    try {
      const saved = localStorage.getItem(columnSizesKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === "object") {
          return parsed as Record<string, number>
        }
      }
    } catch {
      // Ignore parse errors
    }
    return {}
  })
  
  const setColumnSizing = React.useCallback((value: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
    setColumnSizingState(value)
  }, [])

  React.useEffect(() => {
    if (!collection || typeof window === "undefined") return
    try {
      const key = columnSizesKey
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === "object") {
          setColumnSizing(parsed)
        } else {
          setColumnSizing({})
        }
      } else {
        setColumnSizing({})
      }
    } catch (e) {
      console.warn("Failed to restore column sizing:", e)
      setColumnSizing({})
    }
  }, [collection, columnSizesKey, setColumnSizing])

  React.useEffect(() => {
    if (collection && typeof window !== "undefined" && Object.keys(columnSizing).length > 0) {
      try {
        const isMobileDevice = window.innerWidth < 1024
        const key = isMobileDevice
          ? `column-sizes-mobile-${collection}`
          : `column-sizes-desktop-${collection}`
        localStorage.setItem(key, JSON.stringify(columnSizing))
      } catch (e) {
        console.error("Failed to save column sizes:", e)
      }
    }
  }, [columnSizing, collection])

  return { columnSizing, setColumnSizing }
}
