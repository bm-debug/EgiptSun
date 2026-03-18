"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Gamepad2,
  Target,
  FileText,
  Settings,
  MessageSquare,
  Users,
  BookOpen,
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
    href: "/a",
  },
  {
    title: "Games",
    icon: Gamepad2,
    href: "/a/games",
  },
  {
    title: "Campaigns",
    icon: Target,
    href: "/a/campaigns",
  },
  {
    title: "Reports",
    icon: FileText,
    href: "/a/reports",
  },
  {
    title: "Users",
    icon: Users,
    href: "/a/users",
  },
  {
    title: "Directories",
    icon: BookOpen,
    href: "/a/directories",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/a/settings",
  },
  {
    title: "Support",
    icon: MessageSquare,
    href: "/a/support",
  },
]

export function AdministratorSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { handleMouseDown } = useResizableSidebar()
  const pathname = usePathname()
  const { user } = useMe()
  const supportedLanguageCodes = LANGUAGES.map(lang => lang.code)
  
  const [locale, setLocaleState] = React.useState<LanguageCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-locale')
      if (saved && supportedLanguageCodes.includes(saved as LanguageCode)) {
        return saved as LanguageCode
      }
    }
    return getInitialLocale()
  })

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
  
  const translationsRef = React.useRef<any>(null)
  const localeRef = React.useRef(locale)
  const [, setVersion] = React.useReducer(x => x + 1, 0)

  React.useEffect(() => {
    if (localeRef.current === locale && translationsRef.current) {
      return
    }
    
    localeRef.current = locale
    
    const cacheKey = `sidebar-translations-${locale}`
    const cached = typeof window !== 'undefined' ? sessionStorage.getItem(cacheKey) : null
    
    if (cached) {
      try {
        const cachedTranslations = JSON.parse(cached)
        translationsRef.current = cachedTranslations
        setVersion()
      } catch (e) {
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
        
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(cacheKey, JSON.stringify(translationsData))
        }
        setVersion()
      } catch (e) {
        if (!isMounted) return
        
        console.error('Failed to load translations:', e)
        try {
          const translationsModule = locale === 'ru'
            ? await import("@/packages/content/locales/ru.json")
            : await import("@/packages/content/locales/en.json")
          const translationsData = translationsModule.default || translationsModule
          
          if (!isMounted) return
          
          translationsRef.current = translationsData
          
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
  
  const translations = translationsRef.current
  
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)
  React.useEffect(() => {
    if (translations) {
      forceUpdate()
    }
  }, [translations])

  const t = React.useMemo(() => {
    if (!translations) {
      return {
        platform: "Administrator Portal",
        menuItem: (key: string): string => key,
      }
    }
    const administratorTranslations = translations?.sidebar?.administrator || {}
    const platform = administratorTranslations.platform || "Administrator Portal"
    const menuItems = administratorTranslations.menuItems || {}
    
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
    if (href === "/a") {
      return pathname === "/a" || pathname === "/a/dashboard"
    }
    return pathname?.startsWith(href) ?? false
  }, [pathname])

  const teams = React.useMemo(() => [{
    name: t.platform,
    logo: Logo,
    plan: "",
    href: "/a",
    order: 0,
  }], [t.platform])

  const userProps = React.useMemo(() => {
    if (!user) return null
    return {
      name: user.name || user.email || "Администратор",
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
