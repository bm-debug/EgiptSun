"use client"

import * as React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { COLLECTION_GROUPS } from "@/shared/collections"
import { getCollection } from "@/shared/collections/getCollection"
import BaseCollection, { type OLAPSettings, type OLAPOptions } from "@/shared/collections/BaseCollection"
import { LANGUAGES, PROJECT_SETTINGS } from "@/settings"

export type AdminFilter = {
  field: string
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "in"
  value: unknown
}

export type AdminState = {
  collection: string
  page: number
  pageSize: number
  filters: AdminFilter[]
  search: string
}

const DEFAULT_STATE: AdminState = {
  collection: "users",
  page: 1,
  pageSize: 10,
  filters: [],
  search: "",
}

const AdminStateContext = createContext<{
  state: AdminState
  setState: (updater: (prev: AdminState) => AdminState) => void
  replaceState: (next: AdminState) => void
  pushState: (next: Partial<AdminState>) => void
  collectionConfig: BaseCollection | null
  olapSettings: OLAPSettings | null
}>({ 
  state: DEFAULT_STATE, 
  setState: () => {}, 
  replaceState: () => {},
  pushState: () => {},
  collectionConfig: null,
  olapSettings: null,
})

function AdminStateProviderInner({ 
  children, 
  initialState 
}: { 
  children: ReactNode
  initialState?: AdminState
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Stabilize initialState reference to prevent dependency array size changes
  const initialStateRef = React.useRef(initialState)
  React.useEffect(() => {
    initialStateRef.current = initialState
  }, [initialState])

  const parseStateFromSearchParams = useCallback((params: URLSearchParams, path: string): AdminState => {
    if (initialStateRef.current) {
      return initialStateRef.current
    }
    const paramCollection = params.get("c")
    const isAdminRoot = path === "/admin" || path === "/admin/"
    const isEditorRoot = path === "/e" || path === "/e/"
    let collectionFromPath = ""
    if (!paramCollection && path) {
      const pathParts = path.split("/").filter(Boolean)
      const prefix = pathParts[0]
      const potentialCollection = pathParts[1]
      const specialAdminRoutes = ["settings", "sql-editor", "seed", "dashboard"]
      const allCollections = Object.values(COLLECTION_GROUPS).flat()
      if (prefix === "admin" && pathParts.length >= 2 && !specialAdminRoutes.includes(potentialCollection) && allCollections.includes(potentialCollection)) {
        collectionFromPath = potentialCollection
      } else if (prefix === "e" && pathParts.length >= 2 && allCollections.includes(potentialCollection)) {
        collectionFromPath = potentialCollection
      }
    }
    const collection =
      paramCollection !== null
        ? paramCollection
        : collectionFromPath
          ? collectionFromPath
          : isAdminRoot
            ? DEFAULT_STATE.collection
            : isEditorRoot
              ? "deals"
              : ""
    const page = Math.max(1, Number(params.get("p") || DEFAULT_STATE.page))
    const pageSize = Math.max(1, Number(params.get("ps") || DEFAULT_STATE.pageSize))
    const search = params.get("s") || DEFAULT_STATE.search
    const filtersParam = params.get("f")
    let filters: AdminFilter[] = []
    if (filtersParam) {
      try {
        const parsed = JSON.parse(filtersParam)
        if (Array.isArray(parsed)) {
          filters = parsed.filter((f) => f && typeof f.field === "string")
        }
      } catch {}
    }
    return { collection, page, pageSize, filters, search }
  }, [])

  const parseStateFromSearch = useCallback((): AdminState => {
    return parseStateFromSearchParams(searchParams, pathname)
  }, [searchParams, pathname, parseStateFromSearchParams])

  const [state, _setState] = useState<AdminState>(() => {
    if (typeof window !== "undefined" && window.location.search) {
      return parseStateFromSearchParams(new URLSearchParams(window.location.search), pathname)
    }
    return parseStateFromSearch()
  })
  const pendingUrlUpdateRef = React.useRef<string | null>(null)
  const pendingUrlPushRef = React.useRef<string | null>(null)
  const justSetSearchRef = React.useRef(false)

  // Sync state from URL on mount; when on /e or /admin with no c, replace URL with default collection
  useEffect(() => {
    if (initialStateRef.current) return
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const c = params.get("c")
    const fromUrl = parseStateFromSearchParams(params, pathname)
    const basePath = pathname?.replace(/\/$/, "") || ""
    if (!c && fromUrl.collection && (basePath === "/e" || basePath === "/admin")) {
      params.set("c", fromUrl.collection)
      params.set("p", String(fromUrl.page))
      params.set("ps", String(fromUrl.pageSize))
      router.replace(`${basePath}?${params.toString()}`)
    }
    if (c != null && c !== state.collection) {
      _setState((prev) => (JSON.stringify(prev) !== JSON.stringify(fromUrl) ? fromUrl : prev))
    }
  }, [])

  // Update document title based on collection
  useEffect(() => {
    document.title = state.collection ? `${state.collection} - Admin Panel` : "Admin Panel"
  }, [state.collection])

  // Apply pending URL updates (replace)
  useEffect(() => {
    if (pendingUrlUpdateRef.current) {
      router.replace(pendingUrlUpdateRef.current)
      pendingUrlUpdateRef.current = null
    }
  }, [state, router])



  useEffect(() => {
    // When URL changes (e.g., back/forward), sync state
    // But skip if initialState was provided (isolated provider)
    if (initialStateRef.current) {
      return
    }
    const next = parseStateFromSearch()
    _setState((prev) => {
      // When URL has no "s" param, keep current search so we don't clear user-set search before router.replace updates URL
      let nextSearch = searchParams.has("s") ? next.search : prev.search
      // If we just set search from UI and URL would clear it, preserve (race: router.replace not yet applied)
      if (justSetSearchRef.current && prev.search && !nextSearch) {
        nextSearch = prev.search
      }
      const nextState = { ...next, search: nextSearch }
      const changed = JSON.stringify(prev) !== JSON.stringify(nextState)
      return changed ? nextState : prev
    })
  }, [searchParams, pathname, parseStateFromSearch])

  const setState = useCallback((updater: (prev: AdminState) => AdminState) => {
    _setState((prev) => {
      const next = updater(prev)
      // Don't sync URL if initialState was provided (isolated provider)
      if (initialStateRef.current) {
        return next
      }
      if (next.search !== prev.search) {
        justSetSearchRef.current = true
        setTimeout(() => { justSetSearchRef.current = false }, 300)
      }
      // Sync URL with replace (no history entry) - defer to useEffect to avoid render warnings

      const params = new URLSearchParams()
      params.set("c", next.collection)
      params.set("p", String(next.page))
      params.set("ps", String(next.pageSize))
      if (next.search) params.set("s", next.search)
      if (next.filters.length) params.set("f", JSON.stringify(next.filters))
      pendingUrlUpdateRef.current = `${pathname}?${params.toString()}`
      return next
    })
  }, [ state])

  
  // Push state with history entry (for navigation)
  const pushState = useCallback((partial: Partial<AdminState>) => {
    _setState((prev) => {
      const next = { ...prev, ...partial }
      // Don't sync URL if initialState was provided (isolated provider)
      if (initialStateRef.current) {
        return next
      }
      console.trace('pushState',location.href, next,state )
      // Sync URL with push (creates history entry) - defer to useEffect to avoid render warnings
      const params = new URLSearchParams()
      params.set("c", next.collection)
      params.set("p", String(next.page))
      params.set("ps", String(next.pageSize))
      if (next.search) params.set("s", next.search)
      if (next.filters.length) params.set("f", JSON.stringify(next.filters))
      pendingUrlPushRef.current = `${pathname}?${params.toString()}`
      return next
    })
  }, [pathname, router])

  const replaceState = useCallback((next: AdminState) => setState(() => next), [setState])

  // Get collection config based on current collection
  const collectionConfig = useMemo(() => {
    return state.collection ? getCollection(state.collection) : null
  }, [state.collection])

  // Get OLAP settings for the current collection
  const [olapSettings, setOlapSettings] = useState<OLAPSettings | null>(null)
  const [olapLoading, setOlapLoading] = useState(false)

  useEffect(() => {
    if (!collectionConfig) {
      setOlapSettings(null)
      return
    }

    let cancelled = false
    setOlapLoading(true)

    // Get locale from localStorage or use default
    const getLocale = (): OLAPOptions['locale'] => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('sidebar-locale')
        const supportedLanguageCodes = LANGUAGES.map(lang => lang.code)
        if (saved && supportedLanguageCodes.includes(saved as any)) {
          return saved as OLAPOptions['locale']
        }
      }
      // Use PROJECT_SETTINGS.defaultLanguage, but ensure it's in LANGUAGES
      const defaultLang = PROJECT_SETTINGS.defaultLanguage
      const supportedLanguageCodes = LANGUAGES.map(lang => lang.code)
      if (supportedLanguageCodes.includes(defaultLang as any)) {
        return defaultLang as OLAPOptions['locale']
      }
      // Fallback to first available language
      return (LANGUAGES[0]?.code || 'en') as OLAPOptions['locale']
    }
    
    const locale = getLocale()
    
    collectionConfig.getOLAP({ locale })
      .then((settings) => {
        if (!cancelled) {
          setOlapSettings(settings)
          setOlapLoading(false)
        }
      })
      .catch((error) => {
        console.error('Failed to load OLAP settings:', error)
        if (!cancelled) {
          setOlapSettings(null)
          setOlapLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [collectionConfig])

  const value = useMemo(() => ({ 
    state, 
    setState, 
    replaceState,
    pushState,
    collectionConfig,
    olapSettings,
  }), [state, setState, replaceState, pushState, collectionConfig, olapSettings])

  return (
    <AdminStateContext.Provider value={value}>
      {children}
    </AdminStateContext.Provider>
  )
}

export function AdminStateProvider({ 
  children, 
  initialState 
}: { 
  children: ReactNode
  initialState?: AdminState
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminStateProviderInner initialState={initialState}>{children}</AdminStateProviderInner>
    </Suspense>
  )
}

export function useAdminState() {
  const ctx = useContext(AdminStateContext)
  return ctx
}

// Hook to subscribe only to collection changes, not entire state
// This prevents re-renders when other parts of state change
export function useAdminCollection() {
  const ctx = useContext(AdminStateContext)
  const collectionRef = React.useRef(ctx.state.collection)
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)
  
  React.useEffect(() => {
      const checkCollection = () => {
        if (collectionRef.current !== ctx.state.collection) {
          collectionRef.current = ctx.state.collection
          forceUpdate()
        }
      }
      
      // Subscribe to context changes, but only update if collection actually changed
      checkCollection()
    }, [ctx.state.collection])
    
    return collectionRef.current
}

// Hook to get collection config
export function useCollectionConfig(): BaseCollection | null {
  const ctx = useContext(AdminStateContext)
  return ctx.collectionConfig
}

// Hook to get OLAP settings
// If locale is provided, loads settings for that specific locale
// Otherwise returns settings loaded with default locale from context
export function useOlapSettings(locale?: OLAPOptions['locale']): OLAPSettings | null {
  const ctx = useContext(AdminStateContext)
  const [localOlapSettings, setLocalOlapSettings] = useState<OLAPSettings | null>(null)
  const [loading, setLoading] = useState(false)

  // If no locale provided, return context settings
  if (!locale) {
    return ctx.olapSettings
  }

  // If locale is provided, load settings for that locale
  useEffect(() => {
    if (!ctx.collectionConfig) {
      setLocalOlapSettings(null)
      return
    }

    let cancelled = false
    setLoading(true)

    ctx.collectionConfig.getOLAP({ locale })
      .then((settings) => {
        if (!cancelled) {
          setLocalOlapSettings(settings)
          setLoading(false)
        }
      })
      .catch((error) => {
        console.error('Failed to load OLAP settings:', error)
        if (!cancelled) {
          setLocalOlapSettings(null)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [ctx.collectionConfig, locale])

  return localOlapSettings
}