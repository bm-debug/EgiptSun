"use client"

import * as React from "react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger, SidebarContext } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Grip } from "lucide-react"
import { useAdminCollection } from "@/packages/components/blocks-app/app-admin/AdminStateProvider"
import { getCollection } from "@/shared/collections/getCollection"
import { LANGUAGES, PROJECT_SETTINGS } from "@/settings"
import { useNotifications } from "./NotificationsContext"
import { ChatTriggerButton } from "../chat"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BreadcrumbItemObject } from "@/shared/services/collection/types"
interface AdminHeaderProps {
  title?: string
  breadcrumbItems?: BreadcrumbItemObject[]
}

// Safe SidebarTrigger that only renders if SidebarProvider exists
function SafeSidebarTrigger({ className }: { className?: string }) {
  const sidebarContext = React.useContext(SidebarContext)
  if (!sidebarContext) {
    return null
  }
  return <SidebarTrigger className={className} />
}

export const AdminHeader = React.memo(function AdminHeader({ 
  title,
  breadcrumbItems 
}: AdminHeaderProps) {
  // Only subscribe to collection, not entire state
  const currentCollection = useAdminCollection()
  type LanguageCode = (typeof LANGUAGES)[number]['code']
  const supportedLanguageCodes = LANGUAGES.map(lang => lang.code)
  
  const [locale, setLocale] = React.useState<LanguageCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-locale')
      if (saved && supportedLanguageCodes.includes(saved as LanguageCode)) {
        return saved as LanguageCode
      }
    }
    // Use PROJECT_SETTINGS.defaultLanguage, but ensure it's in LANGUAGES
    const defaultLang = PROJECT_SETTINGS.defaultLanguage
    if (supportedLanguageCodes.includes(defaultLang as LanguageCode)) {
      return defaultLang as LanguageCode
    }
    // Fallback to first available language
    return LANGUAGES[0]?.code || 'en'
  })
  const [displayTitle, setDisplayTitle] = React.useState<string>(title || '')
  const prevCollectionRef = React.useRef<string | null>(null)
  const displayTitleRef = React.useRef<string>(title || '')
  const [translations, setTranslations] = React.useState<any>(null)
  const { open: notificationsOpen, setOpen: setNotificationsOpen } = useNotifications()
  const [unreadCount, setUnreadCount] = React.useState(0)

  // Sync locale with sidebar when it changes
  React.useEffect(() => {
    const handleLocaleChanged = (e: StorageEvent | CustomEvent) => {
      const newLocale = (e as CustomEvent).detail || (e as StorageEvent).newValue
      if (newLocale && supportedLanguageCodes.includes(newLocale as LanguageCode)) {
        setLocale(newLocale as LanguageCode)
      }
    }

    // Listen to localStorage changes
    window.addEventListener('storage', handleLocaleChanged as EventListener)
    // Listen to custom event from sidebar
    window.addEventListener('sidebar-locale-changed', handleLocaleChanged as EventListener)

    return () => {
      window.removeEventListener('storage', handleLocaleChanged as EventListener)
      window.removeEventListener('sidebar-locale-changed', handleLocaleChanged as EventListener)
    }
  }, [])

  // Load translations
  React.useEffect(() => {
    const loadTranslations = async () => {
      try {
        const cacheKey = `sidebar-translations-${locale}`
        const cached = typeof window !== 'undefined' ? sessionStorage.getItem(cacheKey) : null
        
        if (cached) {
          try {
            const cachedTranslations = JSON.parse(cached) as { dataTable?: { adminPanel?: string }; taxonomy?: { entityOptions?: Record<string, string> } }
            setTranslations(cachedTranslations)
            // Continue to fetch fresh translations in background to ensure we have latest
            // Don't return here, let it fetch fresh data
          } catch (e) {
            console.error('[AdminHeader] Failed to parse cached translations:', e)
            // If parsing fails, proceed with fetch
          }
        }
        
        const response = await fetch(`/api/locales/${locale}`)
        if (!response.ok) {
          throw new Error(`Failed to load translations: ${response.status}`)
        }
        const text = await response.text()
        let translationsData: { dataTable?: { adminPanel?: string }; taxonomy?: { entityOptions?: Record<string, string> } }
        try {
          translationsData = JSON.parse(text)
        } catch {
          throw new Error('Invalid JSON from locales API')
        }
        setTranslations(translationsData)
        
        // Cache translations
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(cacheKey, JSON.stringify(translationsData))
        }
      } catch (e) {
        console.error('[AdminHeader] Failed to load translations:', e)
        // Fallback to direct import
        try {
          // Try to import the locale file, fallback to 'en' if not found
          let translationsModule
          try {
            translationsModule = await import(`@/packages/content/locales/${locale}.json`)
          } catch {
            translationsModule = await import("@/packages/content/locales/en.json")
          }
          setTranslations(translationsModule.default || translationsModule)
        } catch (fallbackError) {
          console.error('Fallback import also failed:', fallbackError)
        }
      }
    }
    
    loadTranslations()
  }, [locale])

  const adminPanelLabel = React.useMemo(() => {
    const label = translations?.dataTable?.adminPanel || "Admin Panel"
    return label
  }, [locale, translations?.dataTable?.adminPanel])

  // Convert collection name to taxonomy entity key (used for translations)
  const collectionToEntityKey = React.useCallback((collection: string): string => {
    const specialCases: Record<string, string> = {
      echelon_employees: "employee_echelon",
      product_variants: "product_variant",
      asset_variants: "asset_variant",
      text_variants: "text_variant",
      wallet_transactions: "wallet_transaction",
      base_moves: "base_move",
      base_move_routes: "base_move_route",
      message_threads: "message_thread",
      outreach_referrals: "outreach_referral",
      echelons: "employee_echelon",
      employee_timesheets: "employee_timesheet",
      employee_leaves: "employee_leave",
      journal_generations: "journal_generation",
      journal_connections: "journal_connection",
      user_sessions: "user_session",
      user_bans: "user_ban",
      user_verifications: "user_verification",
      role_permissions: "role_permission",
      roles: "role",
    }
    if (specialCases[collection]) return specialCases[collection]
    if (collection.endsWith("ies")) return collection.slice(0, -3) + "y"
    if (collection.endsWith("es") && !collection.endsWith("ses")) return collection.slice(0, -2)
    if (collection.endsWith("s")) return collection.slice(0, -1)
    return collection
  }, [])

  React.useEffect(() => {
    if (title) {
      displayTitleRef.current = title
      setDisplayTitle(title)
      prevCollectionRef.current = null
      return
    }

    if (!currentCollection) {
      return
    }

    prevCollectionRef.current = currentCollection

    // Get collection config to check for __title
    const collection = getCollection(currentCollection)
    const titleConfig = (collection as any).__title
    
    // Try to get translated collection name from taxonomy.entityOptions
    let collectionTitle: string
    if (translations?.taxonomy?.entityOptions) {
      const entityKey = collectionToEntityKey(currentCollection)
      const entityOptions = translations.taxonomy.entityOptions as Record<string, string>
      collectionTitle = entityOptions[entityKey] || currentCollection.charAt(0).toUpperCase() + currentCollection.slice(1)
    } else {
      // Use __title if available, otherwise use collection name
      const collectionName = currentCollection.charAt(0).toUpperCase() + currentCollection.slice(1)
      collectionTitle = collectionName
      
      // Check if __title is a string or BaseColumn
      if (typeof titleConfig === 'string') {
        collectionTitle = titleConfig
      } else if (titleConfig?.options?.defaultValue) {
        collectionTitle = titleConfig.options.defaultValue
      }
    }
    
    displayTitleRef.current = collectionTitle
    setDisplayTitle(collectionTitle)
    
    // Update document title
    const panelLabel = translations?.dataTable?.adminPanel || "Admin Panel"
    const newTitle = `${collectionTitle} - ${panelLabel}`
    document.title = newTitle
    
    // Set again after a short delay to override Next.js metadata
    const timeouts = [
      setTimeout(() => { document.title = newTitle }, 0),
      setTimeout(() => { document.title = newTitle }, 10),
      setTimeout(() => { document.title = newTitle }, 100),
    ]
    
    return () => {
      timeouts.forEach(t => clearTimeout(t))
    }
  }, [locale, currentCollection, title, translations?.taxonomy?.entityOptions, translations?.dataTable?.adminPanel, collectionToEntityKey])

  // Fetch unread notifications count
  const fetchUnreadCount = React.useCallback(async () => {
    try {
      const response = await fetch("/api/altrp/v1/admin/notifications?limit=50&offset=0", {
        credentials: "include",
        cache: "no-store",
      })
      if (response.ok) {
        const data = (await response.json()) as { success: boolean; notifications?: Array<{ isRead?: boolean }> }
        if (data.success) {
          const unread = (data.notifications || []).filter((n) => !n.isRead).length
          setUnreadCount(unread)
        }
      }
    } catch (err) {
      console.error("Failed to fetch unread count", err)
    }
  }, [])

  React.useEffect(() => {
    fetchUnreadCount()
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Refresh count when drawer closes
  React.useEffect(() => {
    if (!notificationsOpen) {
      fetchUnreadCount()
    }
  }, [notificationsOpen, fetchUnreadCount])

  // Use state for breadcrumb items to trigger re-renders when translations change
  const finalBreadcrumbItems = React.useMemo(() => {
    if (breadcrumbItems) {
      return breadcrumbItems
    }
    
    // Use displayTitle state and translations for breadcrumbs
    const entityKey = collectionToEntityKey(currentCollection)
    const entityOptions = (translations as any)?.taxonomy?.entityOptions || {}
    const collectionLabel = displayTitle || entityOptions[entityKey] || currentCollection
    
    return [
      { label: adminPanelLabel, href: "#" },
      { label: collectionLabel },
    ]
  }, [breadcrumbItems, displayTitle, currentCollection, adminPanelLabel, translations?.taxonomy?.entityOptions, collectionToEntityKey, locale])

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SafeSidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb className="flex-1">
          <BreadcrumbList>
            {finalBreadcrumbItems.map((item, index) => {
              const isLast = index === finalBreadcrumbItems.length - 1
              return (
                <React.Fragment key={index}>
                  {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                  <BreadcrumbItem className={index > 0 ? "hidden md:block" : ""}>
                    {isLast ? (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild><Link href={item.href || "#"}>{item.label}</Link></BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-2">
          <ChatTriggerButton variant="ghost" size="icon" />
          {/* Notifications Bell */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setNotificationsOpen(true)
            }}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
          {/* Quick Access Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Grip className="h-5 w-5" />
                <span className="sr-only">Quick Access</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/admin/deals">{translations?.admin?.deals || "Deals"}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/tasks">{translations?.admin?.tasks || "Tasks"}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/transactions">{translations?.admin?.finances || "Finances"}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  )
}, (prevProps, nextProps) => {
  // Only re-render if title or breadcrumbItems actually changed
  if (prevProps.title !== nextProps.title) {
    return false
  }
  
  if (prevProps.breadcrumbItems?.length !== nextProps.breadcrumbItems?.length) {
    return false
  }
  
  if (prevProps.breadcrumbItems && nextProps.breadcrumbItems) {
    for (let i = 0; i < prevProps.breadcrumbItems.length; i++) {
      if (
        prevProps.breadcrumbItems[i].label !== nextProps.breadcrumbItems[i].label ||
        prevProps.breadcrumbItems[i].href !== nextProps.breadcrumbItems[i].href
      ) {
        return false
      }
    }
  }
  
  return true // Skip re-render
})


