"use client"

import * as React from "react"
import { ChevronsUpDown, Check } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useAdminState } from "../app-admin/AdminStateProvider"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ExpanseSelector } from "./expanse-selector"

export const TeamSwitcher = React.memo(function TeamSwitcher({
  teams,
  translations,
}: {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
    href?: string
  }[]
  translations?: any
}) {
  const { isMobile, state } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const { pushState } = useAdminState()
  // Use state with initial value matching server render (always expanded on server)
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  
  React.useEffect(() => {
    // Update collapsed state only on client after mount
    setIsCollapsed(state === "collapsed")
  }, [state])
  // Use ref to track teams to avoid unnecessary state updates
  const teamsRef = React.useRef(teams)
  
  // Determine active team based on current pathname
  const getActiveTeam = React.useCallback(() => {
    if (!teams || teams.length === 0) return null
    if (!pathname) return teams[0]
    
    if (pathname.startsWith('/c/')) {
      return teams.find(t => t.href?.startsWith('/c/')) || teams[0]
    }
    if (pathname.startsWith('/i/')) {
      return teams.find(t => t.href?.startsWith('/i/')) || teams[0]
    }
    if (pathname.startsWith('/p/')) {
      return teams.find(t => t.href?.startsWith('/p/')) || teams[0]
    }
    if (pathname.startsWith('/m/')) {
      return teams.find(t => t.href?.startsWith('/m/')) || teams[0]
    }
    
    return teams[0]
  }, [pathname, teams])
  
  const [activeTeam, setActiveTeam] = React.useState(() => getActiveTeam())
  
  // Update activeTeam when pathname or teams change
  React.useEffect(() => {
    const newActiveTeam = getActiveTeam()
    if (newActiveTeam && newActiveTeam !== activeTeam) {
      setActiveTeam(newActiveTeam)
    }
  }, [pathname, teams, getActiveTeam, activeTeam])

  const t = React.useMemo(() => {
    if (!translations) {
      return {
        teamSwitcher: { teamsLabel: "Roles" },
        dashboard: { title: "Dashboard" },
      }
    }
    // Ensure teamSwitcher translations are properly extracted
    const teamSwitcherTranslations = translations.teamSwitcher || {}
    const teamsLabel = teamSwitcherTranslations.teamsLabel || "Roles"
    
    // Debug: log if translation is missing
    if (!teamSwitcherTranslations.teamsLabel && translations.teamSwitcher) {
      console.warn('[TeamSwitcher] teamSwitcher.teamsLabel not found in translations:', translations.teamSwitcher)
    }
    
    return {
      teamSwitcher: {
        teamsLabel: teamsLabel
      },
      dashboard: translations.dashboard || { title: "Dashboard" },
    }
  }, [translations])

  // Detect platform for hotkey display
  const isMac = React.useMemo(() => {
    if (typeof window === 'undefined') return false
    return /Mac|iPhone|iPod|iPad/i.test(navigator.platform) || /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)
  }, [])

  // Format hotkey shortcut for display
  const formatHotkey = React.useCallback((index: number) => {
    if (isMac) {
      return `⌘⌥${index + 1}`
    }
    return `Ctrl+Alt+${index + 1}`
  }, [isMac])

  // Handle team navigation - for admin links with ?c= update state first so collection sticks
  const handleTeamClick = React.useCallback((team: typeof teams[0]) => {
    if (!team.href) return
    const isAdminWithCollection = pathname === "/admin" || pathname === "/admin/"
    if (isAdminWithCollection && team.href.startsWith("/admin") && team.href.includes("?c=")) {
      try {
        const url = new URL(team.href, typeof window !== "undefined" ? window.location.origin : "http://localhost")
        const c = url.searchParams.get("c")
        const p = url.searchParams.get("p")
        const ps = url.searchParams.get("ps")
        if (c) {
          pushState({
            collection: c,
            page: p ? Math.max(1, Number(p)) : 1,
            pageSize: ps ? Math.max(1, Number(ps)) : 10,
          })
          return
        }
      } catch {
        // fallback to router.push
      }
    }
    router.push(team.href)
  }, [router, pathname, pushState])

  // Register global hotkeys
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Alt+{1-9} or Cmd+Alt+{1-9}
      const isModifierPressed = isMac 
        ? (e.metaKey || e.ctrlKey) && e.altKey
        : e.ctrlKey && e.altKey
      
      if (!isModifierPressed) return

      // Check if number key 1-9 is pressed
      const key = e.key
      if (key >= '1' && key <= '9') {
        const index = parseInt(key) - 1
        if (teams[index] && teams[index].href) {
          e.preventDefault()
          e.stopPropagation()
          handleTeamClick(teams[index])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [teams, isMac, handleTeamClick])

  if (!activeTeam) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className={cn(
                      "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                      isCollapsed && "rounded-none!"
                    )}
                  >
                    {typeof activeTeam.logo === 'function' ? (
                      <>
                        {isCollapsed ? (
                          <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-none" suppressHydrationWarning>
                            <Image
                              src="/images/favicon.png"
                              alt="Favicon"
                              width={32}
                              height={32}
                              className="w-full h-full object-contain rounded-none"
                            />
                          </div>
                        ) : (
                          <>
                            {(() => {
                              const LogoComponent = activeTeam.logo as React.ComponentType<{ className?: string }>
                              return <LogoComponent className="h-8" />
                            })()}
                            <ChevronsUpDown className="ml-auto" />
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
                          {typeof activeTeam.logo === 'string' ? (
                            <Image
                              src={activeTeam.logo}
                              alt={activeTeam.name}
                              width={16}
                              height={16}
                              className="size-4"
                            />
                          ) : (
                            typeof activeTeam.logo === 'function'
                              ? (() => {
                                  const LogoComponent = activeTeam.logo as React.ComponentType<{ className?: string }>
                                  return <LogoComponent className="size-4" />
                                })()
                              : null
                          )}
                        </div>
                        {!isCollapsed && (
                          <>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                              <span className="truncate font-medium">{activeTeam.name}</span>
                              <span className="truncate text-xs">{activeTeam.plan}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto" />
                          </>
                        )}
                      </>
                    )}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" align="center" sideOffset={8}>
                  <p>{activeTeam.name}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {t.teamSwitcher.teamsLabel}
            </DropdownMenuLabel>
            {teams.map((team, index) => {
              // Determine if this team is active based on pathname (without useMemo - hooks can't be in loops)
              const isActive = (() => {
                if (!pathname || !team.href) return false
                // Exact match or pathname starts with href
                if (pathname === team.href || pathname.startsWith(team.href + '/')) return true
                // Fallback to prefix-based matching for backward compatibility
                if (pathname.startsWith('/admin') && team.href === '/admin/dashboard') return true
                if (pathname.startsWith('/m/') && team.href.startsWith('/m/')) return true
                if (pathname.startsWith('/c/') && team.href.startsWith('/c/')) return true
                if (pathname.startsWith('/i/') && team.href.startsWith('/i/')) return true
                if (pathname.startsWith('/p/') && team.href.startsWith('/p/')) return true
                return false
              })()

              return (
                <DropdownMenuItem
                  key={team.href || `${team.name}-${index}`}
                  onClick={() => {
                    handleTeamClick(team)
                  }}
                  className="gap-2 p-2"
                >
                  {team.name}
                  <div className="ml-auto flex items-center gap-2">
                    {isActive && <Check className="h-4 w-4" />}
                    <DropdownMenuShortcut>{formatHotkey(index)}</DropdownMenuShortcut>
                  </div>
                </DropdownMenuItem>
              )
            })}
            <ExpanseSelector translations={translations} />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}, (prevProps, nextProps) => {
  // If teams reference is the same, skip deep comparison (mutations happen in-place)
  if (prevProps.teams === nextProps.teams && prevProps.translations === nextProps.translations) {
    return true // Same references - skip re-render
  }
  
  // Compare teams structure
  if (prevProps.teams.length !== nextProps.teams.length) {
    return false
  }
  
  for (let i = 0; i < prevProps.teams.length; i++) {
    // Check all properties including name to detect translation changes
    if (
      prevProps.teams[i].logo !== nextProps.teams[i].logo ||
      prevProps.teams[i].plan !== nextProps.teams[i].plan ||
      prevProps.teams[i].name !== nextProps.teams[i].name ||
      prevProps.teams[i].href !== nextProps.teams[i].href
    ) {
      return false
    }
  }
  
  // For translations, compare by reference (they should be stable)
  if (prevProps.translations !== nextProps.translations) {
    // If translations changed, check if relevant sections are actually different
    const prevTeamSwitcher = prevProps.translations?.teamSwitcher
    const nextTeamSwitcher = nextProps.translations?.teamSwitcher
    const prevDashboard = prevProps.translations?.dashboard
    const nextDashboard = nextProps.translations?.dashboard
    
    if (
      (prevTeamSwitcher !== nextTeamSwitcher && JSON.stringify(prevTeamSwitcher) !== JSON.stringify(nextTeamSwitcher)) ||
      (prevDashboard !== nextDashboard && JSON.stringify(prevDashboard) !== JSON.stringify(nextDashboard))
    ) {
      return false // Re-render needed
    }
  }
  
  return true // Skip re-render
})
