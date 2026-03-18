"use client"

import * as React from "react"
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  Check,
  CreditCard,
  Globe,
  LogOut,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useTheme } from "@/packages/hooks/use-theme"
import { usePathname, useRouter } from "next/navigation"
import { useCallback } from "react"
import { LANGUAGES } from "@/settings"
import { getLanguageFlag } from "@/shared/utils/language-flags"
import { useNotifications } from "@/components/blocks-app/app-admin/NotificationsContext"

type LanguageCode = (typeof LANGUAGES)[number]['code']

function getInitialsFromNameOrEmail(inputName: string | undefined, email: string | undefined): string {
  const name = (inputName || "").trim()
  const source = name || (email || "").trim()
  if (!source) return "U"

  // Prefer first/last from name when possible
  const parts = source
    .replace(/[@._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// Remove middle name (отчество) from full name - keep only first and last name
function toFirstLastName(fullName: string): string {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 2) return parts.join(" ")
  // For Russian names: LastName FirstName MiddleName -> LastName FirstName
  // For English names: FirstName LastName MiddleName -> FirstName LastName
  const hasCyrillic = /[А-Яа-яЁё]/.test(fullName)
  if (hasCyrillic && parts.length >= 2) {
    // Russian format: LastName FirstName MiddleName
    return `${parts[0]} ${parts[1]}`
  }
  // English format: FirstName LastName MiddleName
  return `${parts[0]} ${parts[1]}`
}

export const NavUser = React.memo(function NavUser({
  user,
  locale,
  onLocaleChange,
  translations,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  locale?: LanguageCode
  onLocaleChange?: (locale: LanguageCode) => void
  translations?: any
}) {
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const { setOpen: setNotificationsOpen } = useNotifications()

  const basePath = React.useMemo(() => {
    if (pathname?.startsWith("/m/")) return "/m"
    if (pathname?.startsWith("/admin")) return "/admin"
    return "/admin"
  }, [pathname])

  const t = translations?.navUser || {
    notifications: "Notifications",
    english: "English",
    russian: "Russian",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    logOut: "Log out",
  }

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light", false)
  }, [theme, setTheme])

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
      if (res.ok) {
        window.location.href = "/login"
      }
    } catch (e) {
      window.location.href = "/login"
    }
  }

  const currentLanguage = React.useMemo(() => {
    if (locale) {
      const found = LANGUAGES.find((l) => l.code === locale)
      if (found) return found
    }
    return LANGUAGES[0]
  }, [locale])

  const initials = React.useMemo(() => {
    const displayName = toFirstLastName(user.name)
    return getInitialsFromNameOrEmail(displayName, user.email)
  }, [user.name, user.email])

  const displayName = React.useMemo(() => {
    return toFirstLastName(user.name)
  }, [user.name])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={displayName} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuItem
              className="p-0 font-normal cursor-pointer"
              onClick={() => router.push(`${basePath}/profile`)}
            >
              <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={displayName} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setNotificationsOpen(true)}>
                <Bell />
                {t.notifications}
              </DropdownMenuItem>
              {onLocaleChange && LANGUAGES.length > 1 && (
                <>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center gap-2">
                      {(() => {
                        const FlagComponent = getLanguageFlag(currentLanguage?.code || "")
                        return FlagComponent ? (
                          <FlagComponent className="h-4 w-3" />
                        ) : (
                          <Globe className="h-4 w-4" />
                        )
                      })()}
                      <span className="flex-1">
                        {currentLanguage?.name} ({currentLanguage?.shortName})
                      </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent sideOffset={6} className="min-w-56">
                      {LANGUAGES.map((lang) => {
                        const FlagComponent = getLanguageFlag(lang.code)
                        const isCurrentLocale = locale === lang.code

                        return (
                          <DropdownMenuItem
                            key={lang.code}
                            disabled={isCurrentLocale}
                            onClick={() => onLocaleChange(lang.code)}
                            className="flex items-center gap-2"
                          >
                            {FlagComponent ? (
                              <FlagComponent className="h-4 w-3" />
                            ) : (
                              <Globe className="h-4 w-4" />
                            )}
                            <span className="flex-1">
                              {lang.name} ({lang.shortName})
                            </span>
                            {isCurrentLocale ? <Check className="h-4 w-4" /> : null}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={toggleTheme}>
                {theme === "light" ? <Moon /> : <Sun />}
                {theme === "light" ? t.darkMode : t.lightMode}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              {t.logOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if props actually changed
  if (
    prevProps.user.name !== nextProps.user.name ||
    prevProps.user.email !== nextProps.user.email ||
    prevProps.user.avatar !== nextProps.user.avatar ||
    prevProps.locale !== nextProps.locale
  ) {
    return false // Re-render needed
  }
  
  // For translations, compare by reference (they should be stable)
  if (prevProps.translations !== nextProps.translations) {
    // If translations changed, check if navUser section is actually different
    const prevNavUser = prevProps.translations?.navUser
    const nextNavUser = nextProps.translations?.navUser
    if (prevNavUser !== nextNavUser && JSON.stringify(prevNavUser) !== JSON.stringify(nextNavUser)) {
      return false // Re-render needed
    }
  }
  
  return true // Skip re-render
})
