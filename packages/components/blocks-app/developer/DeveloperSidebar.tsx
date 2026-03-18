"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Gamepad2,
  Target,
  FileText,
  CreditCard,
  Settings,
  MessageSquare,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useResizableSidebar } from "@/packages/hooks/use-resizable-sidebar"
import { NavUser } from "@/packages/components/blocks-app/admin/nav-user"
import { TeamSwitcher } from "@/packages/components/blocks-app/admin/team-switcher"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useMe } from "@/providers/MeProvider"
import { Logo } from "@/components/misc/logo/logo"
import { LANGUAGES } from "@/settings"
import { getInitialLocale, LanguageCode } from "@/lib/getInitialLocale"

const navigationItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/d",
  },
  {
    title: "Games",
    icon: Gamepad2,
    href: "/d/games",
  },
  {
    title: "Campaigns",
    icon: Target,
    href: "/d/campaigns",
  },
  {
    title: "Reports",
    icon: FileText,
    href: "/d/reports",
  },
  {
    title: "Billing",
    icon: CreditCard,
    href: "/d/billing",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/d/settings",
  },
  {
    title: "Support",
    icon: MessageSquare,
    href: "/d/support",
  },
]

export function DeveloperSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { handleMouseDown } = useResizableSidebar()
  const pathname = usePathname()
  const { user } = useMe()
  const supportedLanguageCodes = LANGUAGES.map(lang => lang.code)
  
  // Use useState instead of useLocalStorage to avoid SSR issues
  const [locale, setLocaleState] = React.useState<LanguageCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-locale')
      if (saved && supportedLanguageCodes.includes(saved as LanguageCode)) {
        return saved as LanguageCode
      }
    }
    return getInitialLocale()
  })

  // Sync with localStorage on client
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-locale', locale)
    }
  }, [locale])

  const setLocale = React.useCallback((newLocale: LanguageCode) => {
    setLocaleState(newLocale)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-locale', newLocale)
      window.dispatchEvent(new CustomEvent('sidebar-locale-changed', { detail: newLocale }))
    }
  }, [])
  
  // Use ref to preserve translations across component remounts
  const translationsRef = React.useRef<any>(null)
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
        setVersion()
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
          setVersion()
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
  
  // Force re-render when translations change
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)
  React.useEffect(() => {
    if (translations) {
      forceUpdate()
    }
  }, [translations])

  // Create translation function
  const t = React.useMemo(() => {
    if (!translations) {
      return {
        platform: "Developer Portal",
        menuItem: (key: string): string => key,
      }
    }
    const developerTranslations = translations?.sidebar?.developer || {}
    const platform = developerTranslations.platform || "Developer Portal"
    const menuItems = developerTranslations.menuItems || {}
    
    return {
      platform,
      menuItem: (key: string): string => {
        return menuItems[key as keyof typeof menuItems] || key
      },
    }
  }, [translations])

  const handleLocaleChange = React.useCallback((newLocale: LanguageCode) => {
    if (supportedLanguageCodes.includes(newLocale)) {
      setLocale(newLocale)
    }
  }, [supportedLanguageCodes, setLocale])

  // Build menu items structure - each item is separate, no grouping
  const menuItems = React.useMemo(() => {
    if (!translations) {
      return []
    }
    
    return navigationItems.map((item) => ({
      title: t.menuItem(item.title),
      url: item.href,
      icon: item.icon,
    }))
  }, [translations, t])

  const isActive = React.useCallback((href: string) => {
    if (href === "/d") {
      return pathname === "/d"
    }
    return pathname?.startsWith(href) ?? false
  }, [pathname])

  // Create teams for TeamSwitcher (single team for Developer Portal)
  const teams = React.useMemo(() => [{
    name: t.platform,
    logo: Logo,
    plan: "",
    href: "/d",
    order: 0,
  }], [t.platform])

  const userProps = React.useMemo(() => {
    if (!user) return null
    return {
      name: user.name || user.email || "Разработчик",
      email: user.email || "",
      avatar: (user as any).avatarUrl || "/images/avatar-placeholder.svg",
    }
  }, [user])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams as any} translations={translations} />
      </SidebarHeader>
      <SidebarContent className="py-2">
        <SidebarMenu>
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.url)
            return (
              <SidebarMenuItem key={item.url} className="mx-2">
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className={cn(
                    active && 'bg-sidebar-accent text-sidebar-accent-foreground'
                  )}
                >
                  <Link href={item.url} className="flex w-full items-center gap-2">
                    {Icon && <Icon className="h-4 w-4" />}
                    <span className="flex-1 text-left">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {userProps && (
          <NavUser
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
