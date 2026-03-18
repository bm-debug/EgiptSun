import * as React from "react"
import type { SearchCondition } from "@/shared/utils/search-parser"
import type { SortingState } from "@tanstack/react-table"
import { getCollection } from "@/shared/collections/getCollection"

export function useDataTableTableState(collection: string) {
  const [searchConditions, setSearchConditions] = React.useState<SearchCondition[]>([])
  const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(new Set())
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < 1024
  })

  const defaultSorting = React.useMemo<SortingState>(() => {
    const collectionConfig = getCollection(collection)
    return [...collectionConfig.__defaultSort] as SortingState
  }, [collection])

  const sortingKey = React.useMemo<string>(() => {
    return `sorting-${collection}`
  }, [collection])

  // Use useState instead of useLocalStorage to avoid SSR issues
  const [sorting, setSortingState] = React.useState<SortingState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(sortingKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            return parsed as SortingState
          }
        } catch {
          // If parsing fails, use default
        }
      }
    }
    return defaultSorting
  })

  // Sync with localStorage on client
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(sortingKey, JSON.stringify(sorting))
    }
  }, [sorting, sortingKey])

  const setSorting = React.useCallback((newSorting: SortingState | ((prev: SortingState) => SortingState)) => {
    const actualSorting = typeof newSorting === 'function' ? newSorting(sorting) : newSorting
    setSortingState(actualSorting)
    if (typeof window !== "undefined") {
      localStorage.setItem(sortingKey, JSON.stringify(actualSorting))
    }
  }, [sorting, sortingKey])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return {
    searchConditions,
    setSearchConditions,
    visibleColumns,
    setVisibleColumns,
    isMobile,
    setIsMobile,
    sorting,
    setSorting,
    defaultSorting,
    sortingKey,
  }
}
