import * as React from "react"

export function useDataTableShowFilterRow(collection: string) {
  const [showFilterRow, setShowFilterRow] = React.useState<boolean>(() => {
    if (typeof window !== "undefined" && collection) {
      try {
        const saved = localStorage.getItem(`show-filter-row-${collection}`)
        if (saved !== null) {
          return JSON.parse(saved) === true
        }
      } catch (e) {
        console.warn("Failed to restore show filter row from localStorage:", e)
      }
    }
    return false // Default: hidden
  })

  // Restore show filter row when collection changes
  React.useEffect(() => {
    if (!collection || typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(`show-filter-row-${collection}`)
      if (saved !== null) {
        setShowFilterRow(JSON.parse(saved) === true)
      } else {
        setShowFilterRow(false)
      }
    } catch (e) {
      console.warn("Failed to restore show filter row:", e)
      setShowFilterRow(false)
    }
  }, [collection])

  // Save show filter row to localStorage when it changes
  React.useEffect(() => {
    if (collection && typeof window !== "undefined") {
      try {
        localStorage.setItem(`show-filter-row-${collection}`, JSON.stringify(showFilterRow))
      } catch (e) {
        console.warn("Failed to save show filter row to localStorage:", e)
      }
    }
  }, [showFilterRow, collection])

  return { showFilterRow, setShowFilterRow }
}
