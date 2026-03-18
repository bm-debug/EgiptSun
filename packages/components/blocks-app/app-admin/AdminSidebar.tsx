'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  FileText,
  Users,
  BookOpen,
  FileQuestion,
  MessageSquare,
  CheckSquare,
  Database,
  Settings,
  CreditCard,
  Terminal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMe } from '@/providers/MeProvider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Logo } from '@/components/misc/logo/logo'
import { useResizableSidebar } from '@/packages/hooks/use-resizable-sidebar'
import { useTheme } from '@/packages/hooks/use-theme'
import { User, Sun, Moon } from 'lucide-react'
import { useNotice } from './AdminNoticesProvider'
import { Badge } from '@/components/ui/badge'
import { TeamSwitcher } from '@/packages/components/blocks-app/admin/team-switcher'
import { NavUser } from '@/packages/components/blocks-app/admin/nav-user'
import { LANGUAGES } from '@/settings'

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

export interface NavigationItem {
  title: string
  url: string
  icon: LucideIcon
}

interface NavigationGroup {
  title: string
  items: NavigationItem[]
}

const navigationGroups: NavigationGroup[] = [
  {
    title: 'Операции',
    items: [
      {
        title: 'Общая сводка',
        url: '/admin/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Заявки',
        url: '/admin/loans',
        icon: FileText,
      },
      {
        title: 'Сделки',
        url: '/admin/deals',
        icon: FileText,
      },
      {
        title: 'Транзакции',
        url: '/admin/transactions',
        icon: CreditCard,
      },
    ],
  },
  {
    title: 'Люди',
    items: [
      {
        title: 'Пользователи',
        url: '/admin/users',
        icon: Users,
      },
      {
        title: 'Поручители',
        url: '/admin/guardians',
        icon: Users,
      },
    ],
  },
  // Временно скрыто
  {
    title: 'Контент',
    items: [
      {
        title: 'Блог',
        url: '/admin/content/blog',
        icon: BookOpen,
      },
      // {
      //   title: 'Страницы',
      //   url: '/admin/content/pages',
      //   icon: FileText,
      // },
      // {
      //   title: 'FAQ',
      //   url: '/admin/content/faq',
      //   icon: FileQuestion,
      // },
    ],
  },
  {
    title: 'Поддержка',
    items: [
      {
        title: 'Поддержка',
        url: '/admin/support',
        icon: MessageSquare,
      },
    ],
  },
  {
    title: 'Задачи',
    items: [
      {
        title: 'Менеджер задач',
        url: '/admin/tasks',
        icon: CheckSquare,
      },
    ],
  },
]

interface AdminSidebarProps {
  user?: {
    name: string
    email: string
    avatar?: string
  }
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()
  const { handleMouseDown } = useResizableSidebar()
  const { theme, setTheme } = useTheme()
  const { user: meUser } = useMe()
  const [translations, setTranslations] = React.useState<any>(null)
  type LanguageCode = (typeof LANGUAGES)[number]['code']
  const supportedLanguageCodes = LANGUAGES.map(lang => lang.code)

  // Determine base path prefix (/m or /admin)
  const basePath = pathname?.startsWith('/m/') ? '/m' : '/admin'

  // Load translations and locale
  const [locale, setLocale] = React.useState<LanguageCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-locale')
      if (saved && supportedLanguageCodes.includes(saved as LanguageCode)) {
        return saved as LanguageCode
      }
    }
    return 'ru'
  })

  React.useEffect(() => {
    const loadTranslations = async () => {
      try {
        const response = await fetch(`/api/locales/${locale}`)
        if (response.ok) {
          const data = await response.json()
          setTranslations(data)
        }
      } catch (e) {
        console.error('Failed to load translations:', e)
      }
    }
    loadTranslations()
  }, [locale])

  const handleLocaleChange = React.useCallback((newLocale: LanguageCode) => {
    if (supportedLanguageCodes.includes(newLocale)) {
      setLocale(newLocale)
      localStorage.setItem('sidebar-locale', newLocale)
      window.dispatchEvent(new CustomEvent('sidebar-locale-changed', { detail: newLocale }))
    }
  }, [supportedLanguageCodes])

  // Prepare user props for NavUser - get avatar from meUser if available
  const userProps = React.useMemo(() => {
    if (!user) {
      // Try to get user from meUser hook if user prop is not provided
      if (meUser) {
        const avatarUrl = (meUser as any).avatarUrl || null
        return {
          name: toFirstLastName(meUser.name),
          email: meUser.email,
          avatar: avatarUrl || "/images/avatar-placeholder.svg",
        }
      }
      return null
    }
    // If user prop is provided, use it, but prefer avatarUrl from meUser if available
    const avatarUrl = (meUser as any)?.avatarUrl || user.avatar
    return {
      name: toFirstLastName(user.name),
      email: user.email,
      avatar: avatarUrl || "/images/avatar-placeholder.svg",
    }
  }, [user, meUser])

  // Check if user is super admin (has Administrator role)
  const isSuperAdmin = meUser?.roles?.some((role) => role.name === 'Administrator') || false

  // Build teams from user roles
  const teams = React.useMemo(() => {
    if (!meUser?.roles) return []
    
    const roleTeams = meUser.roles
      .filter(role => {
        try {
          const dataIn = typeof role.dataIn === 'string' ? JSON.parse(role.dataIn) : role.dataIn
          return dataIn?.auth_redirect_url
        } catch {
          return false
        }
      })
      .map(role => {
        const dataIn = typeof role.dataIn === 'string' ? JSON.parse(role.dataIn) : role.dataIn
        const name = role.title.replace(/Кабинет\s*/, '')
        // Try to get order from dataIn, fallback to 0
        const order = dataIn?.order ? Number(dataIn.order) : 0
        return {
          name: name,
          logo: Logo,
          plan: role.description || '',
          href: dataIn.auth_redirect_url,
          order: order,
        }
      })
      .sort((a, b) => a.order - b.order)

    // Add Super Admin role if user has Administrator role
    if (isSuperAdmin) {
      const superAdminExists = roleTeams.some(team => team.href === '/admin/dashboard')
      if (!superAdminExists) {
        roleTeams.unshift({
          name: 'Супер-админ',
          logo: Logo,
          plan: "Super Admin Dashboard",
          href: "/admin/dashboard",
          order: -1,
        })
      }
    }

    // Add Manager's Cabinet if user has admin/manager role or is on /m/ path
    const isAdminOrManager = meUser.roles.some(r => ['Administrator', 'admin', 'Manager'].includes(r.name))
    const isManagerPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/m/')

    if (isAdminOrManager || isManagerPath) {
      const managerRoleExists = roleTeams.some(team => team.href === '/m/dashboard')
      if (!managerRoleExists) {
        roleTeams.push({
          name: 'Менеджерский',
          logo: Logo,
          plan: "Manager's Dashboard",
          href: "/m/dashboard",
          order: 0,
        })
      }
    }

    // Sort by order after all additions
    return roleTeams.sort((a, b) => a.order - b.order)
  }, [meUser?.roles, isSuperAdmin])

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const isActive = (url: string) => {
    if (!pathname) return false
    
    // Remove query parameters from URL for comparison
    const cleanUrl = url.split('?')[0]
    const cleanPathname = pathname.split('?')[0]
    
    // Exact match
    if (cleanPathname === cleanUrl) return true
    
    // Check if pathname starts with url + '/' (for nested routes)
    // But only if url doesn't end with '/'
    if (cleanPathname.startsWith(cleanUrl + '/')) {
      return true
    }
    
    return false
  }

  // Hooks must be called before any conditional returns
  const newLoans = useNotice('new_loans_count')
  const kycPending = useNotice('kyc_pending_count')
  const unreadSupportChats = useNotice('unread_support_chats_count')

  // Compute active role name based on pathname and teams
  const activeRoleName = React.useMemo(() => {
    if (!pathname || !teams || teams.length === 0) {
      return translations?.sidebar?.platform || "Platform"
    }
    
    // Find active team based on pathname
    let activeTeam = null
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

    return activeTeam?.name || teams[0]?.name || translations?.sidebar?.platform || "Platform"
  }, [pathname, teams, translations?.sidebar?.platform])

  // Build navigation groups dynamically based on user role
  const getNavigationGroups = (): NavigationGroup[] => {
    const groups: NavigationGroup[] = navigationGroups.map(group => ({
      ...group,
      items: group.items.map(item => {
        // Apply translations for specific items
        let translatedTitle = item.title
        if (item.url === '/admin/deals' || item.url === '/m/deals') {
          translatedTitle = translations?.admin?.deals || item.title
        } else if (item.url === '/admin/tasks' || item.url === '/m/tasks') {
          translatedTitle = translations?.admin?.tasks || item.title
        }
        return {
          ...item,
          title: translatedTitle,
          url: item.url.replace('/admin', basePath)
        }
      })
    }))

    // Add system links for super admin only
    if (isSuperAdmin) {
      const systemCategoryTitle = translations?.sidebar?.categories?.System || 'Система'
      const settingsTitle = translations?.sidebar?.menuItems?.Settings || 'Настройки'
      const seedTitle = translations?.sidebar?.menuItems?.Seed || 'Seed'
      const sqlEditorTitle = translations?.sidebar?.menuItems?.SqlEditor || 'SQL Editor'
      
      groups.push({
        title: systemCategoryTitle,
        items: [
          {
            title: settingsTitle,
            url: `${basePath}/settings`,
            icon: Settings,
          },
          {
            title: seedTitle,
            url: `${basePath}/seed`,
            icon: Database,
          },
          {
            title: sqlEditorTitle,
            url: `${basePath}/sql-editor`,
            icon: Terminal,
          },
        ],
      })
    }

    return groups
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <TeamSwitcher teams={teams} translations={translations} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{activeRoleName}</SidebarGroupLabel>
          <Accordion type="multiple" className="w-full">
            {getNavigationGroups().map((group) => (
              <AccordionItem key={group.title} value={group.title} className="border-none">
                <AccordionTrigger className="px-2 py-2 text-sm font-medium">
                  {group.title}
                </AccordionTrigger>
                <AccordionContent>
                  <SidebarMenu className="overflow-visible">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const active = isActive(item.url)
                      const isLoansItem = item.url === '/admin/loans'
                      const isUsersItem = item.url === '/admin/users'
                      const isSupportItem = item.url === '/admin/support'
                      const hasNewLoans = typeof newLoans === 'number' && newLoans > 0
                      const hasKycPending = typeof kycPending === 'number' && kycPending > 0
                      const hasUnreadSupportChats = typeof unreadSupportChats === 'number' && unreadSupportChats > 0
                      return (
                        <SidebarMenuItem key={item.url} className="mx-2">
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            className={cn(
                              active && 'bg-sidebar-accent text-sidebar-accent-foreground'
                            )}>
                            <Link href={item.url} className="flex w-full items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="flex-1 text-left">{item.title}</span>
                              {isLoansItem && hasNewLoans && (
                                <Badge variant="secondary" className="ml-auto">
                                  {newLoans}
                                </Badge>
                              )}
                              {isUsersItem && hasKycPending && (
                                <Badge 
                                  variant="secondary" 
                                  className="ml-auto cursor-pointer hover:bg-secondary/80"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    window.location.href = '/admin/users?kycStatus=pending'
                                  }}
                                >
                                  {kycPending}
                                </Badge>
                              )}
                              {isSupportItem && hasUnreadSupportChats && (
                                <Badge variant="secondary" className="ml-auto">
                                  {unreadSupportChats}
                                </Badge>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </SidebarGroup>
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

