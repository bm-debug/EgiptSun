"use client"

import * as React from "react"
import { useUserSocket } from "@/hooks/use-user-socket"
import { useMe } from "@/providers/MeProvider"

type ClientNotices = Record<string, number>

type ClientNoticesContextValue = {
  notices: ClientNotices
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  getNotice: (key: string) => number | undefined
}

const ClientNoticesContext = React.createContext<ClientNoticesContextValue>({
  notices: {},
  loading: false,
  error: null,
  refresh: async () => {},
  getNotice: () => undefined,
})

export function ClientNoticesProvider({ children }: { children: React.ReactNode }) {
  const [notices, setNotices] = React.useState<ClientNotices>({})
  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const { user: meUser } = useMe()

  const fetchNotices = React.useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const response = await fetch("/api/altrp/v1/c/notices", {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error("Failed to load client notices")
      }

      const data = (await response.json()) as ClientNotices
      setNotices(data || {})
      setError(null)
    } catch (err) {
      if ((err as any)?.name === "AbortError") {
        return
      }
      console.error("Failed to fetch client notices", err)
      setError(err instanceof Error ? err.message : "Failed to load client notices")
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchNotices()
    return () => abortRef.current?.abort()
  }, [fetchNotices])

  // Subscribe to client-updated-notices socket event
  useUserSocket(
    meUser?.humanAid || '',
    meUser?.humanAid
      ? {
          'update-client': (data: { type: string; [key: string]: unknown }) => {
            if (data.type === 'client-updated-notices') {
              fetchNotices()
            }
          },
        }
      : undefined
  )

  const getNotice = React.useCallback((key: string) => notices[key], [notices])

  const value = React.useMemo<ClientNoticesContextValue>(
    () => ({
      notices,
      loading,
      error,
      refresh: fetchNotices,
      getNotice,
    }),
    [error, fetchNotices, getNotice, loading, notices]
  )

  return <ClientNoticesContext.Provider value={value}>{children}</ClientNoticesContext.Provider>
}

export function useClientNotices() {
  return React.useContext(ClientNoticesContext)
}

export function useClientNotice(key: string) {
  const { getNotice } = useClientNotices()
  return getNotice(key)
}

