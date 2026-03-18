"use client"

import * as React from "react"
import { useAdminSocketEvent } from "./AdminSocketProvider"

type AdminNotices = Record<string, number>

type AdminNoticesContextValue = {
  notices: AdminNotices
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  getNotice: (key: string) => number | undefined
}

const AdminNoticesContext = React.createContext<AdminNoticesContextValue>({
  notices: {},
  loading: false,
  error: null,
  refresh: async () => {},
  getNotice: () => undefined,
})

export function AdminNoticesProvider({ children }: { children: React.ReactNode }) {
  const [notices, setNotices] = React.useState<AdminNotices>({})
  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const isMountedRef = React.useRef<boolean>(true)

  const fetchNotices = React.useCallback(async () => {
    if (abortRef.current && !abortRef.current.signal.aborted) {
      abortRef.current.abort("New request started")
    }
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/altrp/v1/admin/notices", {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      })

      // Check if request was aborted before processing response
      if (controller.signal.aborted) {
        return
      }

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = "Failed to load admin notices"
        try {
          const errorData = await response.json() as { error?: string } | null
          errorMessage = (errorData && 'error' in errorData && errorData.error) ? errorData.error : errorMessage
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage
        }
        
        // Check again if aborted before updating state
        if (controller.signal.aborted) {
          return
        }
        
        // Log error but don't throw - just set error state
        console.warn(`[AdminNotices] Failed to load notices: ${response.status} ${errorMessage}`)
        setError(errorMessage)
        // Set empty notices instead of throwing
        setNotices({})
        return
      }

      const data = (await response.json()) as AdminNotices
      
      // Check again if aborted before updating state
      if (controller.signal.aborted) {
        return
      }
      
      setNotices(data || {})
      setError(null)
    } catch (err) {
      // Ignore AbortError completely - it's expected when component unmounts or request is cancelled
      if ((err as any)?.name === "AbortError" || err instanceof DOMException && err.name === "AbortError") {
        return
      }
      
      // Check if aborted or component unmounted before updating state
      if (controller.signal.aborted || !isMountedRef.current) {
        return
      }
      
      // Only log error if component is still mounted and request wasn't aborted
      console.error("[AdminNotices] Failed to fetch admin notices", err)
      
      const errorMessage = err instanceof Error ? err.message : "Failed to load admin notices"
      setError(errorMessage)
      // Set empty notices instead of leaving in error state
      setNotices({})
    } finally {
      // Only update loading state if this controller is still the current one
      if (abortRef.current === controller && !controller.signal.aborted) {
        abortRef.current = null
        setLoading(false)
      } else if (abortRef.current === controller) {
        // If aborted, just clear the ref
        abortRef.current = null
      }
    }
  }, [])

  React.useEffect(() => {
    isMountedRef.current = true
    fetchNotices()
    return () => {
      isMountedRef.current = false
      if (abortRef.current && !abortRef.current.signal.aborted) {
        try {
          abortRef.current.abort()
        } catch {
          // Ignore - signal may already be aborted
        }
      }
    }
  }, [fetchNotices])

  useAdminSocketEvent(
    "admin-updated-notices",
    () => {
      fetchNotices()
    },
    [fetchNotices]
  )

  const getNotice = React.useCallback((key: string) => notices[key], [notices])

  const value = React.useMemo<AdminNoticesContextValue>(
    () => ({
      notices,
      loading,
      error,
      refresh: fetchNotices,
      getNotice,
    }),
    [error, fetchNotices, getNotice, loading, notices]
  )

  return <AdminNoticesContext.Provider value={value}>{children}</AdminNoticesContext.Provider>
}

export function useAdminNotices() {
  return React.useContext(AdminNoticesContext)
}

export function useNotice(key: string) {
  const { getNotice } = useAdminNotices()
  return getNotice(key)
}
