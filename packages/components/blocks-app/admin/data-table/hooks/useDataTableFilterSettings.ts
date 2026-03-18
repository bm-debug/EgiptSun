import * as React from "react"
import type { FilterSettings } from "../types"

const defaultFilterSettings: FilterSettings = {
  dateFilter: false, // Default: off
  statusFilter: true, // Default: on
  cityFilter: false, // Default: off
  columnFilters: false, // Default: off
}

export function useDataTableFilterSettings(collection: string) {
  const [filterSettings, setFilterSettings] = React.useState<FilterSettings>(() => {
    if (typeof window !== "undefined" && collection) {
      try {
        const saved = localStorage.getItem(`filter-settings-${collection}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && typeof parsed === "object") {
            return {
              dateFilter: parsed.dateFilter === true,
              statusFilter: parsed.statusFilter !== false,
              cityFilter: parsed.cityFilter === true,
              columnFilters: parsed.columnFilters === true,
            }
          }
        }
      } catch (e) {
        console.warn("Failed to restore filter settings from localStorage:", e)
      }
    }
    return defaultFilterSettings
  })

  React.useEffect(() => {
    if (collection && typeof window !== "undefined") {
      try {
        localStorage.setItem(`filter-settings-${collection}`, JSON.stringify(filterSettings))
      } catch (e) {
        console.warn("Failed to save filter settings to localStorage:", e)
      }
    }
  }, [filterSettings, collection])

  React.useEffect(() => {
    if (!collection || typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(`filter-settings-${collection}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === "object") {
          setFilterSettings({
            dateFilter: parsed.dateFilter === true,
            statusFilter: parsed.statusFilter !== false,
            cityFilter: parsed.cityFilter === true,
            columnFilters: parsed.columnFilters === true,
          })
          return
        }
      }
      setFilterSettings(defaultFilterSettings)
    } catch (e) {
      console.warn("Failed to restore filter settings:", e)
      setFilterSettings(defaultFilterSettings)
    }
  }, [collection])

  return { filterSettings, setFilterSettings }
}
