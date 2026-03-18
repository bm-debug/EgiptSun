'use client'

import * as React from 'react'
import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react'
import { MeUser } from '@/shared/types/shared'
import { usePathname, useSearchParams } from 'next/navigation'
import { getInitialLocale, isSupportedLocale, syncLocaleStorage } from '@/lib/getInitialLocale'


interface MeContextValue {
  user: MeUser | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const MeContext = createContext<MeContextValue | null>(null)

interface MeProviderProps {
  children: ReactNode
  /**
   * Interval in milliseconds to refetch user data. Set to 0 or undefined to disable auto-refetch.
   * Default: undefined (no auto-refetch)
   */
  refetchInterval?: number
  /**
   * Whether to refetch when window gains focus. Default: false
   */
  refetchOnFocus?: boolean
}

export function MeProvider({ 
  children, 
  refetchInterval,
  refetchOnFocus = false,
}: MeProviderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<MeUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authDebugEnabled, setAuthDebugEnabled] = useState(false)
  const [authDebug, setAuthDebug] = useState<{
    at: string
    url?: string
    origin?: string
    protocol?: string
    ua?: string
    meStatus?: number
    meStatusText?: string
    meBody?: string
  } | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const sp = new URLSearchParams(window.location.search)
      setAuthDebugEnabled(sp.has('authDebug'))
    } catch {
      setAuthDebugEnabled(false)
    }
  }, [])

  const fetchMe = React.useCallback(async (withoutLoading = false) => {
    try {
      ! withoutLoading && setLoading(true)
      setError(null)

      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })

      if (!response.ok) {
        if (authDebugEnabled && typeof window !== 'undefined') {
          let bodyText = ''
          try {
            bodyText = await response.clone().text()
          } catch {
            bodyText = ''
          }
          setAuthDebug({
            at: new Date().toISOString(),
            url: window.location.href,
            origin: window.location.origin,
            protocol: window.location.protocol,
            ua: navigator.userAgent,
            meStatus: response.status,
            meStatusText: response.statusText,
            meBody: bodyText,
          })
        }
        if (response.status === 401 || response.status === 404) {
          setUser(null)
          setError(null)
          return
        }
        throw new Error(`Failed to fetch user: ${response.statusText}`)
      }

      const text = await response.text()
      let data: { user?: MeUser }
      try {
        data = (text ? JSON.parse(text) : {}) as { user?: MeUser }
      } catch {
        data = {}
      }

      if (authDebugEnabled && typeof window !== 'undefined') {
        setAuthDebug({
          at: new Date().toISOString(),
          url: window.location.href,
          origin: window.location.origin,
          protocol: window.location.protocol,
          ua: navigator.userAgent,
          meStatus: response.status,
          meStatusText: response.statusText,
          meBody: text,
        })
      }

      if (data.user) {
        const localeFromUser = data.user.language
        const effectiveLocale = isSupportedLocale(localeFromUser) ? localeFromUser : getInitialLocale()
        syncLocaleStorage(effectiveLocale)
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load user data')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [authDebugEnabled])

  const currentUrl = useMemo(() => {
    const qs = searchParams?.toString()
    return `${pathname || ''}${qs ? `?${qs}` : ''}`
  }, [pathname, searchParams])

  const lastTrackedUrlRef = useRef<string | null>(null)

  // Track page views across the whole app (requires auth; endpoint returns 204 if not authenticated)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!currentUrl) return
    if (lastTrackedUrlRef.current === currentUrl) return
    lastTrackedUrlRef.current = currentUrl

    const payload = {
      pathname: pathname || null,
      search: searchParams?.toString() || null,
      url: window.location.href,
      referrer: document.referrer || null,
      userAgent: navigator.userAgent,
    }

    fetch('/api/auth/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    }).catch(() => {
      // ignore
    })
  }, [currentUrl, pathname, searchParams])

  // Initial fetch
  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  // Periodic refetch
  useEffect(() => {
    if (!refetchInterval || refetchInterval <= 0) {
      return
    }

    const intervalId = setInterval(() => {
      fetchMe()
    }, refetchInterval)

    return () => clearInterval(intervalId)
  }, [refetchInterval, fetchMe])

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnFocus) {
      return
    }

    const handleFocus = () => {
      fetchMe(true)
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetchOnFocus, fetchMe])

  const value: MeContextValue = {
    user,
    loading,
    error,
    refetch: fetchMe,
  }

  return (
    <MeContext.Provider value={value}>
      {children}
      {authDebugEnabled && (
        <div className="fixed bottom-2 left-2 right-2 z-[9999] rounded-lg border bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold">Auth debug</div>
              <div className="text-muted-foreground break-all">
                {authDebug?.origin} • {authDebug?.protocol} • {authDebug?.at}
              </div>
              <div className="text-muted-foreground break-all">
                {authDebug?.ua}
              </div>
              <div className="mt-2 grid gap-1">
                <div>
                  <span className="font-medium">MeProvider.user:</span>{' '}
                  {user ? `${user.email} (${user.id})` : 'null'}
                </div>
                <div>
                  <span className="font-medium">roles:</span>{' '}
                  {user?.roles?.length ?? 0}
                </div>
                {user?.roles?.length ? (
                  <div className="text-muted-foreground break-all">
                    {user.roles
                      .map((r) => {
                        let redirect: string | undefined
                        try {
                          const dataIn = typeof r.dataIn === 'string' ? JSON.parse(r.dataIn) : r.dataIn
                          redirect = dataIn?.auth_redirect_url
                        } catch {
                          redirect = undefined
                        }
                        return `${r.name}${redirect ? `→${redirect}` : ''}`
                      })
                      .join(', ')}
                  </div>
                ) : null}
                <div>
                  <span className="font-medium">/api/auth/me:</span>{' '}
                  {authDebug?.meStatus ? `${authDebug.meStatus} ${authDebug.meStatusText || ''}` : '—'}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-md border px-2 py-1 text-xs hover:bg-muted"
              onClick={() => fetchMe(true)}
            >
              Refresh
            </button>
          </div>
          {authDebug?.meBody ? (
            <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted p-2 text-[10px] leading-snug">
              {authDebug.meBody}
            </pre>
          ) : null}
          <div className="mt-2 text-muted-foreground">
            Hint: добавьте <span className="font-mono">?authDebug=1</span> к URL. Чтобы скрыть — уберите параметр.
          </div>
        </div>
      )}
    </MeContext.Provider>
  )
}

export function useMe(): MeContextValue {
  const context = useContext(MeContext)

  if (!context) {
    throw new Error('useMe must be used within MeProvider')
  }

  return context
}

