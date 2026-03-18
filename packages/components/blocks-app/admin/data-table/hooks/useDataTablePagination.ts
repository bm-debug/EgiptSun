import * as React from "react"

type PaginationState = {
  pageIndex: number
  pageSize: number
}

type UseDataTablePaginationParams = {
  collection: string
  page: number
  pageSize: number
  setState: React.Dispatch<React.SetStateAction<any>>
}

type UseDataTablePaginationResult = {
  pagination: PaginationState
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>
  defaultPageSize: number
  setDefaultPageSize: React.Dispatch<React.SetStateAction<number>>
}

export function useDataTablePagination({
  collection,
  page,
  pageSize,
  setState,
}: UseDataTablePaginationParams): UseDataTablePaginationResult {
  const [defaultPageSize, setDefaultPageSize] = React.useState(() => {
    if (typeof window !== "undefined" && collection) {
      try {
        const saved = localStorage.getItem(`default-page-size-${collection}`)
        if (saved) {
          const parsed = Number(saved)
          if (!isNaN(parsed) && parsed > 0) {
            return parsed
          }
        }
      } catch (e) {
        console.warn("Failed to restore default page size from localStorage:", e)
      }
    }
    return pageSize
  })

  // pagination sync with admin state
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: Math.max(0, page - 1),
    pageSize: defaultPageSize,
  })

  // Refs to track previous values and prevent infinite loops
  const prevPaginationRef = React.useRef(pagination)
  const prevStateRef = React.useRef({ page, pageSize })

  // Restore default page size when collection changes
  React.useEffect(() => {
    if (!collection || typeof window === "undefined") return

    try {
      const saved = localStorage.getItem(`default-page-size-${collection}`)
      if (saved) {
        const parsed = Number(saved)
        if (!isNaN(parsed) && parsed > 0 && parsed !== pageSize) {
          setDefaultPageSize(parsed)
          setPagination((prev: PaginationState) => ({ ...prev, pageSize: parsed }))
          setState((prev: any) => ({ ...prev, pageSize: parsed }))
        }
      }
    } catch (e) {
      console.warn("Failed to restore default page size:", e)
    }
  }, [collection, pageSize, setState])

  // Save default page size to localStorage when it changes
  React.useEffect(() => {
    if (collection && typeof window !== "undefined") {
      try {
        localStorage.setItem(`default-page-size-${collection}`, String(defaultPageSize))
      } catch (e) {
        console.warn("Failed to save default page size to localStorage:", e)
      }
    }
  }, [defaultPageSize, collection])

  React.useEffect(() => {
    // when table pagination changes, reflect to admin state
    const newPage = pagination.pageIndex + 1
    const newPageSize = pagination.pageSize

    // Skip if pagination hasn't actually changed
    if (
      prevPaginationRef.current.pageIndex === pagination.pageIndex &&
      prevPaginationRef.current.pageSize === pagination.pageSize
    ) {
      return
    }

    // Skip if state already has these values (to prevent loops)
    if (prevStateRef.current.page === newPage && prevStateRef.current.pageSize === newPageSize) {
      prevPaginationRef.current = pagination
      return
    }

    prevPaginationRef.current = pagination
    setState((prev: any) => {
      
      if (prev.page === newPage && prev.pageSize === newPageSize) {
        return prev // No change, return same object to prevent re-render
      }
      prevStateRef.current = { page: newPage, pageSize: newPageSize }
      return {
        ...prev,
        page: newPage,
        pageSize: newPageSize,
      }
    })
  }, [pagination.pageIndex, pagination.pageSize, setState])

  React.useEffect(() => {
    // when admin state changes externally (via URL), update table
    const newPageIndex = Math.max(0, page - 1)
    const newPageSize = pageSize

    // Skip if state hasn't actually changed
    if (
      prevStateRef.current.page === page &&
      prevStateRef.current.pageSize === pageSize
    ) {
      return
    }

    // Skip if pagination already has these values (to prevent loops)
    if (
      prevPaginationRef.current.pageIndex === newPageIndex &&
      prevPaginationRef.current.pageSize === newPageSize
    ) {
      prevStateRef.current = { page, pageSize }
      return
    }

    prevStateRef.current = { page, pageSize }
    setPagination((prev: PaginationState) => {
      if (prev.pageIndex === newPageIndex && prev.pageSize === newPageSize) {
        return prev // No change, return same object to prevent re-render
      }
      prevPaginationRef.current = { pageIndex: newPageIndex, pageSize: newPageSize }
      return { pageIndex: newPageIndex, pageSize: newPageSize }
    })
  }, [page, pageSize])

  return { pagination, setPagination, defaultPageSize, setDefaultPageSize }
}
