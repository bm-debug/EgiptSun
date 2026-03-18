"use client"

import * as React from "react"
import {
  Contact,
  TrendingUp,
  Megaphone,
  KanbanSquare,
  Truck,
  UsersRound,
  Landmark,
  FolderArchive,
  MessageSquareMore,
  SlidersHorizontal,
  ShieldCheck,
  Settings2,
  SquareTerminal,
  Terminal,
  LayoutDashboard,
  GraduationCap,
  FolderTree,
} from "lucide-react"
import { Logo } from "@/components/misc/logo/logo"
import { PROJECT_SETTINGS, LANGUAGES, RTL_LOCALES } from "@/settings"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/blocks-app/admin/nav-main"
import { NavUser } from "@/components/blocks-app/admin/nav-user"
import { TeamSwitcher } from "@/components/blocks-app/admin/team-switcher"

// Memoized versions to prevent re-renders
const NavMainMemo = React.memo(NavMain)
const NavUserMemo = React.memo(NavUser)
const TeamSwitcherMemo = React.memo(TeamSwitcher)
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useResizableSidebar } from "@/packages/hooks/use-resizable-sidebar"
import { useAdminState, useAdminCollection } from "../app-admin/AdminStateProvider"
import { useMe } from "@/providers/MeProvider"
import {
  getStoredLocale,
  isSupportedLocale,
  LanguageCode,
  persistLocaleForAuthenticatedUser,
  syncLocaleStorage,
} from "@/lib/getInitialLocale"
import { collectionToEntityKey } from "@/shared/utils/collection-display"

type CollectionsResponse = {
  success: boolean
  total: number
  groups: { category: string; collections: string[] }[]
}

type MeResponse = {
  user?: { id: string; email: string; name: string; role: string; avatarUrl?: string | null }
  error?: string
}

function toFirstLastName(fullName: string): string {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 2) return parts.join(" ")
  return parts.slice(0, 2).join(" ")
}

const categoryIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  Dashboard: LayoutDashboard,
  Contacts: Contact,
  Sales: TrendingUp,
  Marketing: Megaphone,
  Projects: KanbanSquare,
  Logistics: Truck,
  Staff: UsersRound,
  Finance: Landmark,
  Education: GraduationCap,
  Content: FolderArchive,
  Chats: MessageSquareMore,
  Specific: FolderTree,
  Admin: SlidersHorizontal,
  Logs: ShieldCheck,
  System: Settings2,
}

// Global refs to preserve state across component remounts
// These persist even when Next.js remounts the component tree
// In dev mode, Next.js may hot-reload modules, so we also use sessionStorage as backup
function getGlobalRefs() {
  // Try to restore from sessionStorage if available (for dev mode hot-reloads)
  let restoredItems = []
  let restoredItemsStructure = []
  try {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('sidebar-global-items')
      if (stored) {
        restoredItems = JSON.parse(stored)
      }
      const storedStructure = sessionStorage.getItem('sidebar-global-structure')
      if (storedStructure) {
        restoredItemsStructure = JSON.parse(storedStructure)
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
  
  return {
    itemsRef: { current: restoredItems },
    translationsRef: { current: null as any }, // Don't persist translations in sessionStorage
    teamsRef: { 
      current: [
        { name: "Admin", logo: Logo, plan: "", href: "/admin/dashboard" },
      ] 
    },
    itemsStructureRef: { current: restoredItemsStructure },
    currentCollectionRef: { current: "" },
    platformLabelRef: { current: "Platform" },
    userPropsRef: { current: null as any }, // Don't persist user props
  }
}

const globalRefs = getGlobalRefs()
const globalItemsRef = globalRefs.itemsRef
const globalTranslationsRef = globalRefs.translationsRef
const globalTeamsRef = globalRefs.teamsRef
const globalItemsStructureRef = globalRefs.itemsStructureRef
const globalCurrentCollectionRef = globalRefs.currentCollectionRef
const globalPlatformLabelRef = globalRefs.platformLabelRef
const globalUserPropsRef = globalRefs.userPropsRef

// Custom comparison to prevent re-renders on state changes that don't affect sidebar
const AppSidebarComponent = function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  
  // Only subscribe to collection changes, not entire state
  const currentCollection = useAdminCollection()

  const [groups, setGroups] = React.useState<CollectionsResponse["groups"]>([])
  const [user, setUser] = React.useState<MeResponse["user"] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const supportedLanguageCodes = React.useMemo(() => LANGUAGES.map(lang => lang.code), [])
  
  // Use useState instead of useLocalStorage to avoid SSR issues and JSON parsing errors
  const [locale, setLocaleState] = React.useState<LanguageCode>(() => {
    return getStoredLocale()
  })

  // Sync with external locale updates (e.g. from MeProvider)
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const handler = (event: Event) => {
      const nextLocale = (event as CustomEvent<LanguageCode>).detail
      if (!isSupportedLocale(nextLocale)) return
      setLocaleState((prev) => (prev === nextLocale ? prev : nextLocale))
    }
    window.addEventListener("sidebar-locale-changed", handler as EventListener)
    return () => window.removeEventListener("sidebar-locale-changed", handler as EventListener)
  }, [])

  const setLocale = React.useCallback((newLocale: LanguageCode | ((prev: LanguageCode) => LanguageCode)) => {
    const actualLocale = typeof newLocale === 'function' ? newLocale(locale) : newLocale
    if (!supportedLanguageCodes.includes(actualLocale)) {
      return
    }
    setLocaleState(actualLocale)
    syncLocaleStorage(actualLocale)
  }, [locale, supportedLanguageCodes])

  const isRtl = RTL_LOCALES.includes(locale)
  const { handleMouseDown } = useResizableSidebar(isRtl ? "right" : "left")
  
  // Use global ref to preserve translations across component remounts
  const translationsRef = globalTranslationsRef
  const localeRef = React.useRef(locale)
  const [, setVersion] = React.useReducer(x => x + 1, 0)

  React.useEffect(() => {
    if (localeRef.current === locale && translationsRef.current) {
      return // Already loaded for this locale
    }
    
    localeRef.current = locale
    
    // Check cache first
    const cacheKey = `sidebar-translations-${locale}`
    const cached = typeof window !== 'undefined' ? sessionStorage.getItem(cacheKey) : null
    
    if (cached) {
      try {
        const cachedTranslations = JSON.parse(cached)
        translationsRef.current = cachedTranslations
        // Use cached immediately, but still fetch fresh in background (important for newly added locales like rs)
        setVersion()
      } catch (e) {
        // If parsing fails, proceed with fetch
      }
    }

    let isMounted = true

    const loadTranslations = async () => {
      try {
        const response = await fetch(`/api/locales/${locale}`)
        if (!isMounted) return
        
        if (!response.ok) {
          throw new Error(`Failed to load translations: ${response.status}`)
        }
        const translationsData = await response.json() as any
        
        if (!isMounted) return
        
        translationsRef.current = translationsData
        
        // Cache translations
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(cacheKey, JSON.stringify(translationsData))
        }
        setVersion() // Trigger re-render to use translations
      } catch (e) {
        if (!isMounted) return
        
        console.error('Failed to load translations:', e)
        // Fallback: try dynamic import as backup
        try {
          const translationsModule = locale === 'ru'
            ? await import("@/packages/content/locales/ru.json")
            : await import("@/packages/content/locales/en.json")
          const translationsData = translationsModule.default || translationsModule
          
          if (!isMounted) return
          
          translationsRef.current = translationsData
          
          // Cache fallback translations too
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(cacheKey, JSON.stringify(translationsData))
          }
          setVersion() // Trigger re-render to use translations
        } catch (fallbackError) {
          if (!isMounted) return
          console.error('Fallback import also failed:', fallbackError)
        }
      }
    }

    void loadTranslations()
    
    return () => {
      isMounted = false
    }
  }, [locale])
  
  // Use stable reference from ref
  const translations = translationsRef.current
  
  // Force re-render when translations or teams change (for teams update)
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)
  React.useEffect(() => {
    if (translations) {
      forceUpdate()
    }
  }, [translations])

  // Create stable translation functions that don't change reference
  // Include locale in dependencies to ensure translations update when locale changes
  const SIDEBAR_HIDDEN_COLLECTIONS = ['asset_variants', 'text_variants', 'product_variants', 'echelon_employees', 'messages', 'permissions']

  const t = React.useMemo(() => {
    if (!translations) {
      return {
        platform: "Platform",
        category: (category: string) => category,
        collection: (collection: string) => collection,
        collectionTitle: (collection: string) => collection,
      }
    }
    const categories = translations?.sidebar?.categories || {}
    const entityOptions = translations?.taxonomy?.entityOptions || {}
    const displayNames = translations?.sidebar?.collectionDisplayNames || {}
    const platform = translations?.sidebar?.platform || "Platform"

    return {
      platform,
      category: (category: string): string => {
        return categories[category as keyof typeof categories] || category
      },
      collection: (collection: string): string => {
        const entityKey = collectionToEntityKey(collection)
        return entityOptions[entityKey as keyof typeof entityOptions] || collection
      },
      collectionTitle: (collection: string): string => {
        const displayName = displayNames[collection as keyof typeof displayNames]
        if (displayName) return displayName
        const entityKey = collectionToEntityKey(collection)
        return entityOptions[entityKey as keyof typeof entityOptions] || collection
      },
    }
  }, [locale, translations?.sidebar?.platform, translations?.sidebar?.categories, translations?.sidebar?.collectionDisplayNames, translations?.taxonomy?.entityOptions])
  const handleLocaleChange = React.useCallback((newLocale: LanguageCode) => {
    // Validate that the locale is in supported languages
    if (!supportedLanguageCodes.includes(newLocale)) {
      console.warn(`Locale ${newLocale} is not in supported languages`)
      return
    }
    setLocale(newLocale)
    void persistLocaleForAuthenticatedUser(newLocale)
  }, [supportedLanguageCodes, setLocale])

  React.useEffect(() => {
    // Check if data is already loaded in sessionStorage
    const cachedGroups = typeof window !== 'undefined' ? sessionStorage.getItem('sidebar-groups') : null
    const cachedUser = typeof window !== 'undefined' ? sessionStorage.getItem('sidebar-user') : null
    
    if (cachedGroups && cachedUser) {
      try {
        setGroups(JSON.parse(cachedGroups))
        setUser(JSON.parse(cachedUser))
        setLoading(false)
      } catch (e) {
        // If parsing fails, proceed with fetch
      }
    }

    let isMounted = true
    
    const load = async () => {
      // Only show loading if we don't have cached data
      if (!cachedGroups || !cachedUser) {
        if (isMounted) {
          setLoading(true)
        }
      }
      if (isMounted) {
        setError(null)
      }
      
      try {
        const [collectionsRes, meRes] = await Promise.all([
          fetch("/api/admin/collections", { credentials: "include" }),
          fetch("/api/auth/me", { credentials: "include" }),
        ])

        if (!isMounted) return
        
        if (!collectionsRes.ok) throw new Error(`Collections failed: ${collectionsRes.status}`)
        const collectionsJson: CollectionsResponse = await collectionsRes.json()
        
        if (!isMounted) return
        
        setGroups(collectionsJson.groups)

        if (meRes.ok) {
          const meJson: MeResponse = await meRes.json()
          if (meJson.user && isMounted) {
            setUser(meJson.user)
            
            // Cache the data
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('sidebar-groups', JSON.stringify(collectionsJson.groups))
              sessionStorage.setItem('sidebar-user', JSON.stringify(meJson.user))
            }
          }
        }
      } catch (e) {
        if (isMounted) {
          setError((e as Error).message)
        }
      } finally {
        // Only update loading state if component is still mounted
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    void load()
    
    return () => {
      isMounted = false
    }
  }, [])

  // Allow profile page to push updated user fields (e.g., avatar) without full reload
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as Partial<NonNullable<MeResponse["user"]>> | undefined
      if (!detail) return
      setUser((prev) => (prev ? ({ ...prev, ...detail } as any) : (detail as any)))
      try {
        if (typeof window !== "undefined") {
          const cached = sessionStorage.getItem("sidebar-user")
          if (cached) {
            const parsed = JSON.parse(cached)
            sessionStorage.setItem("sidebar-user", JSON.stringify({ ...parsed, ...detail }))
          }
        }
      } catch {
        // ignore
      }
    }
    if (typeof window !== "undefined") {
      window.addEventListener("sidebar-user-updated", handler as EventListener)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("sidebar-user-updated", handler as EventListener)
      }
    }
  }, [])

  const basePath = pathname?.startsWith('/e') ? '/e' : '/admin'

  // Memoize items structure separately from active state to prevent full re-renders
  const itemsStructure = React.useMemo(() => {
    return groups.map((group) => ({
      category: group.category,
      collections: group.collections.filter((c) => !SIDEBAR_HIDDEN_COLLECTIONS.includes(c)),
      icon: categoryIcon[group.category] || SquareTerminal,
    })).filter((group) => group.collections.length > 0)
  }, [groups])

  // Use global refs to preserve state across component remounts
  const itemsRef = globalItemsRef
  const itemsStructureRef = globalItemsStructureRef
  const currentCollectionRef = globalCurrentCollectionRef
  const tRef = React.useRef(t)
  const localeRefForItems = React.useRef(locale)
  
  // Restore items structure to global ref if groups changed
  if (itemsStructure.length > 0 && (
    itemsStructureRef.current.length === 0 ||
    itemsStructureRef.current.length !== itemsStructure.length ||
    itemsStructureRef.current.some((s: any, i: number) => s.category !== itemsStructure[i]?.category)
  )) {
    itemsStructureRef.current = itemsStructure
  }
  
  // Initialize items on mount or when structure/translations change
  // Rebuild if structure changed, items are empty, locale changed, or translations changed
  const needsRebuild = itemsRef.current.length === 0 || 
    itemsRef.current.length !== itemsStructure.length ||
    itemsRef.current.some((item: any, i: number) => item.category !== itemsStructure[i]?.category) ||
    localeRefForItems.current !== locale || // Rebuild when locale changes
    tRef.current !== t // Rebuild when translation functions change
  
  const buildDashboardItem = () => {
    const dashboardScreenTitle = translations?.sidebar?.menuItems?.DashboardScreen ?? "Dashboard"
    const myTasksTitle = translations?.sidebar?.menuItems?.MyTasks ?? "My Tasks"
    return {
      title: t.category("Dashboard"),
      url: "#",
      icon: categoryIcon.Dashboard || SquareTerminal,
      category: "Dashboard",
      collections: [] as string[],
      items: [
        { title: dashboardScreenTitle, url: "/admin/dashboard" },
        { title: myTasksTitle, url: `${basePath}?c=goals&p=1` },
      ],
    }
  }

  if (needsRebuild && itemsStructure.length > 0 && translations) {
    localeRefForItems.current = locale // Update locale ref
    tRef.current = t // Update translation functions ref
    const apiItems = itemsStructure.map((group) => ({
      title: t.category(group.category),
      url: "#",
      icon: group.icon,
      category: group.category,
      collections: group.collections,
      items: group.collections.map((name) => {
        const params = new URLSearchParams()
        params.set("c", name)
        params.set("p", "1")
        return {
          title: t.collectionTitle(name),
          url: `${basePath}?${params.toString()}`,
        }
      }),
    }))
    itemsRef.current = [buildDashboardItem(), ...apiItems]
    currentCollectionRef.current = currentCollection
  }
  
  // Update refs when dependencies change
  React.useEffect(() => {
    tRef.current = t
  }, [t])
  
  // Update items silently - no re-renders, just mutate in place
  React.useEffect(() => {
    const structureChanged = itemsRef.current.length !== itemsStructure.length ||
      itemsRef.current.some((item: any, i: number) => item.category !== itemsStructure[i]?.category)
    
    // Check if locale or translations changed
    const localeChanged = localeRefForItems.current !== locale
    const translationsChanged = tRef.current !== t
    
    if ((structureChanged || localeChanged || translationsChanged) && itemsStructure.length > 0 && translations) {
      // Rebuild items completely when structure, locale, or translations change
      localeRefForItems.current = locale
      tRef.current = t
      itemsStructureRef.current = itemsStructure
      const apiItems = itemsStructure.map((group) => ({
        title: t.category(group.category),
        url: "#",
        icon: group.icon,
        category: group.category,
        collections: group.collections,
        items: group.collections.map((name) => {
          const params = new URLSearchParams()
          params.set("c", name)
          params.set("p", "1")
          return {
            title: t.collectionTitle(name),
            url: `${basePath}?${params.toString()}`,
          }
        }),
      }))
      itemsRef.current = [buildDashboardItem(), ...apiItems]
      currentCollectionRef.current = currentCollection
      
      // Persist structure to sessionStorage for dev mode hot-reloads
      // Note: We can't serialize React components (icons), so we only save structure
      try {
        if (typeof window !== 'undefined') {
          const structureToSave = itemsStructureRef.current.map((s: any) => ({
            category: s.category,
            collections: s.collections,
          }))
          sessionStorage.setItem('sidebar-global-structure', JSON.stringify(structureToSave))
        }
      } catch (e) {
        // Ignore storage errors
      }
    } else if (currentCollectionRef.current !== currentCollection && itemsRef.current.length > 0) {
      // Collection changed, but structure is static - no need to update anything
      // NavMainItem will determine active state from URL automatically
      currentCollectionRef.current = currentCollection
      // No updates needed - items are static, NavMainItem reads from URL
    }
  }, [itemsStructure, currentCollection, translations, locale, t])
  
  // Use state to trigger re-renders when items change due to locale/translations
  const [itemsState, setItemsState] = React.useState(itemsRef.current)
  
  // Update state when itemsRef changes (due to locale/translations change)
  React.useEffect(() => {
    if (itemsRef.current.length > 0) {
      setItemsState(itemsRef.current)
    }
  }, [locale, translations?.sidebar?.platform, translations?.sidebar?.categories, translations?.sidebar?.collectionDisplayNames, translations?.sidebar?.menuItems, translations?.taxonomy?.entityOptions])
  
  // Always return same reference - mutations happen in-place
  let items = itemsState.length > 0 ? itemsState : itemsRef.current

  // Use global ref to preserve teams across component remounts
  const teamsRef = globalTeamsRef
  
  // Get user roles from useMe hook
  const { user: meUser } = useMe()
  
  // Add SQL Editor, Seed into System section for super admins (Settings already in collection)
  const isSuperAdmin = meUser?.roles?.some((r) => r.name === 'Administrator') || false
  const finalItems = React.useMemo(() => {
    if (!isSuperAdmin) return items

    const sqlEditorTitle = translations?.sidebar?.menuItems?.SqlEditor || 'SQL Editor'
    const seedTitle = translations?.sidebar?.menuItems?.Seed || 'Seed'

    const systemMenuItems = [
      { title: sqlEditorTitle, url: '/admin/sql-editor' },
      { title: seedTitle, url: '/admin/seed' },
    ]

    return items.map((item: any) => {
      if (item.category !== 'System') return item
      return {
        ...item,
        items: [...(item.items || []), ...systemMenuItems],
      }
    })
  }, [
    items,
    isSuperAdmin,
    translations?.sidebar?.menuItems?.SqlEditor,
    translations?.sidebar?.menuItems?.Seed,
  ])

  items = finalItems
  
  // Load roles from Roles collection
  const [rolesLoading, setRolesLoading] = React.useState(false)
  
  // Use state for teams to ensure re-renders when teams change
  // Initialize with default Admin team to show logo immediately
  const [teamsState, setTeamsState] = React.useState<Array<{
    name: string
    logo: React.ElementType
    plan: string
    href: string
    order: number
  }>>([
    { name: "Admin", logo: Logo, plan: "", href: "/admin/dashboard", order: 0 }
  ])
  
  const loadRoles = React.useCallback(async () => {
    setRolesLoading(true)
    try {
      const res = await fetch('/api/admin/state?c=roles&ps=1000', {
        credentials: 'include'
      })
      if (!res.ok) {
        throw new Error(`Failed to load roles: ${res.status}`)
      }
      const json = await res.json() as { success?: boolean; data?: any[] }
      
      if (!json.success || !json.data) {
        // If no roles data, clear teamsRef to remove initial "Admin"
        teamsRef.current = []
        setTeamsState([])
        forceUpdate()
        return
      }
      
      // Transform roles to teams format
      const roleTeams: Array<{
        name: string
        logo: React.ElementType
        plan: string
        href: string
        order: number
      }> = []
      
      // Track hrefs during building to prevent duplicates early
      const buildingHrefs = new Set<string>()
      
      
      json.data.forEach((role: any, index: number) => {
        // Extract title for current locale
        let roleName = ''
        if (role.title) {
          let title: any
          if (typeof role.title === 'string') {
            // Try to parse as JSON, fallback to plain string
            try {
              title = JSON.parse(role.title)
            } catch {
              // If parsing fails, treat as plain string
              title = role.title
            }
          } else {
            title = role.title
          }
          // If title is an object (multi-language), get locale-specific value
          if (typeof title === 'object' && title !== null) {
            roleName = title[locale] || title.en || title.ru || title.rs || role.name || ''
          } else {
            // If title is a plain string, use it directly
            roleName = String(title) || role.name || ''
          }
        } else {
          roleName = role.name || ''
        }
        
        // Extract suffix from data_in
        let href = ''
        if (role.data_in) {
          let dataIn: any
          try {
            dataIn = typeof role.data_in === 'string' 
              ? JSON.parse(role.data_in) 
              : role.data_in
          } catch {
            // Ignore parse errors
          }
          
          if (dataIn?.suffix) {
            const suffix = dataIn.suffix[locale] || dataIn.suffix.en || dataIn.suffix.ru || dataIn.suffix.rs
            if (suffix) {
              href = typeof suffix === 'object' && 'value' in suffix 
                ? suffix.value 
                : String(suffix)
            }
          }
        }
        
        // If admin path has no query, infer collection from role name so switching roles keeps correct collection
        const hrefPath = href.split('?')[0]?.replace(/\/$/, '') || ''
        if (hrefPath === '/admin' && !href.includes('?')) {
          const roleNameKey = (role.name || '').toLowerCase()
          const adminCollectionMap: Record<string, string> = {
            user: 'users',
            role: 'roles',
            users: 'users',
            roles: 'roles',
          }
          const collection = adminCollectionMap[roleNameKey]
          if (collection) {
            href = `/admin?c=${collection}&p=1&ps=10`
          }
        }
        
        // Skip if no href (suffix not found)
        if (!href) {
          return
        }
        
        // Skip if we already have a team with this href (prevent duplicates during building)
        if (buildingHrefs.has(href)) {
          console.warn(`[AppSidebar] Skipping duplicate role with href "${href}":`, roleName, '(already have:', Array.from(buildingHrefs).find(h => h === href), ')')
          return
        }
        buildingHrefs.add(href)
        
        // Try to get order from role.order or data_in.order
        const order = role.order !== undefined ? Number(role.order) : 
          (role.data_in && typeof role.data_in === 'object' && 'order' in role.data_in 
            ? Number(role.data_in.order) 
            : 0)
        
        
        roleTeams.push({
          name: roleName,
          logo: Logo,
          plan: role.description || '',
          href: href,
          order,
        })
      })
      
      
      // Remove duplicates by href BEFORE sorting (keep first occurrence with lowest order)
      const hrefMap = new Map<string, typeof roleTeams[0]>()
      roleTeams.forEach(team => {
        if (!team.href) return
        const existing = hrefMap.get(team.href)
        if (!existing || team.order < existing.order) {
          hrefMap.set(team.href, team)
        }
      })
      roleTeams.length = 0
      roleTeams.push(...Array.from(hrefMap.values()))
      
      // Sort by order after deduplication
      roleTeams.sort((a, b) => a.order - b.order)
      
      // IMPORTANT: Do NOT add Admin team if user is super admin
      // The role from database should already contain the admin role with href /admin/dashboard
      // Adding it manually causes duplicates
      // If no admin role exists in database, it means user doesn't have admin access via roles
      // and we should not add it manually
      
      // Final deduplication check to ensure no duplicates by href
      const finalHrefMap = new Map<string, typeof roleTeams[0]>()
      roleTeams.forEach(team => {
        if (!team.href) return
        const existing = finalHrefMap.get(team.href)
        if (!existing || team.order < existing.order) {
          finalHrefMap.set(team.href, team)
        }
      })
      const finalRoleTeams = Array.from(finalHrefMap.values())
      finalRoleTeams.sort((a, b) => a.order - b.order)
      
      // Debug: log if duplicates found
      const hrefs = finalRoleTeams.map(t => t.href).filter(Boolean)
      const uniqueHrefs = new Set(hrefs)
      if (hrefs.length !== uniqueHrefs.size) {
        const duplicates = hrefs.filter((h, i) => hrefs.indexOf(h) !== i)
        console.error('[AppSidebar] CRITICAL: Duplicate hrefs found after deduplication:', duplicates)
        console.error('[AppSidebar] All teams:', finalRoleTeams.map(t => ({ name: t.name, href: t.href })))
      }
      
      // STRICT: Final deduplication by href - keep only one per href
      const strictDedupMap = new Map<string, typeof finalRoleTeams[0]>()
      finalRoleTeams.forEach(team => {
        if (!team.href) return
        // Always keep the first one we encounter (already sorted by order)
        if (!strictDedupMap.has(team.href)) {
          strictDedupMap.set(team.href, team)
        } else {
          console.warn(`[AppSidebar] Removing duplicate team with href "${team.href}":`, team.name)
        }
      })
      const strictFinalTeams = Array.from(strictDedupMap.values())
      strictFinalTeams.sort((a, b) => a.order - b.order)
      
      // Log final result for debugging with detailed info
      
      // Verify no duplicates by href
      const finalHrefs = strictFinalTeams.map(t => t.href).filter(Boolean)
      const finalUniqueHrefs = new Set(finalHrefs)
      if (finalHrefs.length !== finalUniqueHrefs.size) {
        console.error('[AppSidebar] CRITICAL ERROR: Still have duplicates after strict deduplication!')
        console.error('Hrefs:', finalHrefs)
        console.error('Teams:', strictFinalTeams)
      }
      
      // ALWAYS update teamsRef - even if content seems same, we need to ensure fresh reference
      teamsRef.current = [...strictFinalTeams] as any
      // Explicitly update teamsState to ensure UI updates
      setTeamsState([...strictFinalTeams])
      forceUpdate()
    } catch (e) {
      console.error('Failed to load roles:', e)
    } finally {
      setRolesLoading(false)
    }
  }, [locale, translations?.sidebar?.categories?.Admin, translations?.dashboard?.adminPanel, translations?.dashboard?.title, isSuperAdmin, setTeamsState])
  
  // Load roles on mount and when locale or translations change
  React.useEffect(() => {
    void loadRoles()
  }, [loadRoles, translations])
  
  // Sync teamsState with teamsRef when it changes
  // Use a ref to track the last teams string to detect changes
  const lastTeamsStrRef = React.useRef(JSON.stringify(teamsRef.current))
  
  React.useEffect(() => {
    const currentTeams = teamsRef.current
    const currentStr = JSON.stringify(currentTeams)
    
    // Only update if teams actually changed
    if (lastTeamsStrRef.current !== currentStr) {
      lastTeamsStrRef.current = currentStr
      // Ensure no duplicates before setting state
      const hrefMap = new Map<string, typeof currentTeams[0] & { order: number }>()
      currentTeams.forEach(team => {
        if (!team.href) return
        if (!hrefMap.has(team.href)) {
          hrefMap.set(team.href, {
            ...team,
            order: (team as any).order ?? 0
          } as typeof currentTeams[0] & { order: number })
        }
      })
      const dedupedTeams = Array.from(hrefMap.values())
      setTeamsState(dedupedTeams)
    }
  }, [forceUpdate, rolesLoading]) // Also watch rolesLoading to catch when roles finish loading
  
  // NOTE: Disabled - we now use roles from database with their own translations
  // If a role with /admin/dashboard exists in database, it will have its own translated name
  // This effect was causing duplicate "Admin" entries by modifying team names after loadRoles
  // React.useEffect(() => {
  //   if (translations && teamsRef.current.length > 0) {
  //     const adminTeam = teamsRef.current.find(team => team.href === '/admin/dashboard')
  //     if (adminTeam) {
  //       const adminLabel = translations?.sidebar?.categories?.Admin || translations?.dashboard?.adminPanel || "Admin"
  //       if (adminTeam.name !== adminLabel) {
  //         // Create new array with updated team to trigger re-render
  //         teamsRef.current = teamsRef.current.map(team => 
  //           team.href === '/admin/dashboard' 
  //             ? { ...team, name: adminLabel }
  //             : team
  //         )
  //         forceUpdate()
  //       }
  //     }
  //   }
  // }, [translations?.sidebar?.categories?.Admin, translations?.dashboard?.adminPanel, forceUpdate])
  
  const teams = teamsState

  // Use global ref for userProps to maintain stable reference
  const userPropsRef = globalUserPropsRef
  React.useEffect(() => {
    if (user) {
      const newProps = {
        name: toFirstLastName(user.name),
        email: user.email,
        avatar: (user as any).avatarUrl || "/images/avatar-placeholder.svg",
      }
      // Only update if changed
      if (!userPropsRef.current || 
          userPropsRef.current.name !== newProps.name ||
          userPropsRef.current.email !== newProps.email ||
          userPropsRef.current.avatar !== newProps.avatar) {
        userPropsRef.current = newProps
      }
    } else {
      userPropsRef.current = null
    }
  }, [user?.name, user?.email, (user as any)?.avatarUrl])
  const userProps = userPropsRef.current

  // Compute active role name based on pathname and teams
  const activeRoleName = React.useMemo(() => {
    if (!pathname || !teams || teams.length === 0) {
      return translations?.sidebar?.platform || "Platform"
    }
    
    // Find active team based on pathname - check if pathname starts with any team's href
    let activeTeam = teams.find(t => {
      if (!t.href) return false
      // Exact match or pathname starts with href
      return pathname === t.href || pathname.startsWith(t.href + '/')
    })
    
    // Fallback to prefix-based matching for backward compatibility
    if (!activeTeam) {
      if (pathname.startsWith('/admin')) {
        activeTeam = teams.find(t => t.href === '/admin/dashboard' || t.href?.startsWith('/admin'))
      } else if (pathname.startsWith('/m/')) {
        activeTeam = teams.find(t => t.href?.startsWith('/m/'))
      } else if (pathname.startsWith('/c/')) {
        activeTeam = teams.find(t => t.href?.startsWith('/c/'))
      } else if (pathname.startsWith('/i/')) {
        activeTeam = teams.find(t => t.href?.startsWith('/i/'))
      } else if (pathname.startsWith('/p/')) {
        activeTeam = teams.find(t => t.href?.startsWith('/p/'))
      }
    }
    
    return activeTeam?.name || teams[0]?.name || translations?.sidebar?.platform || "Platform"
  }, [pathname, translations?.sidebar?.platform, teams])

  // Use global ref for platformLabel to maintain stable reference
  const platformLabelRef = globalPlatformLabelRef
  React.useEffect(() => {
    if (platformLabelRef.current !== activeRoleName) {
      platformLabelRef.current = activeRoleName
    }
  }, [activeRoleName])
  const platformLabel = platformLabelRef.current

  return (
    <Sidebar collapsible="icon" side={isRtl ? "right" : "left"} {...props}>
      <SidebarHeader>
        <TeamSwitcherMemo teams={teams as any} translations={translations} />
      </SidebarHeader>
      <SidebarContent>
        {loading && (
          <div className="px-3 py-2 text-xs text-muted-foreground">Loading...</div>
        )}
        {error && (
          <div className="px-3 py-2 text-xs text-destructive">{error}</div>
        )}
        {!loading && !error && <NavMainMemo items={items} platformLabel={platformLabel} currentCollection={currentCollection} />}
      </SidebarContent>
      <SidebarFooter>
        {userProps && (
          <NavUserMemo 
            user={userProps}
            locale={locale}
            onLocaleChange={handleLocaleChange}
            translations={translations}
          />
        )}
      </SidebarFooter>
      <SidebarRail onMouseDown={handleMouseDown} />
    </Sidebar>
  )
}

export const AppSidebar = React.memo(AppSidebarComponent, (prevProps, nextProps) => {
  // Always allow re-renders - React.memo will prevent if props are the same
  // The actual optimization happens inside the component with global refs
  return false // Allow re-render (React.memo default behavior)
})

