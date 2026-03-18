'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
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
import { Logo } from '@/components/misc/logo/logo'
import { useResizableSidebar } from '@/packages/hooks/use-resizable-sidebar'
import { useTheme } from '@/packages/hooks/use-theme'
import { User, Sun, Moon, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useClientNotice } from './ClientNoticesProvider'

export interface NavigationItem {
  title: string
  url: string
  icon: LucideIcon
}

interface CabinetSidebarProps {
  user?: {
    name: string
    email: string
    avatar?: string
    rating?: number
  }
  title: string
  navigationItems: NavigationItem[]
  profileUrl?: string
}

export function CabinetSidebar({ user, title, navigationItems, profileUrl = '/c/profile' }: CabinetSidebarProps) {
  const pathname = usePathname()
  const { handleMouseDown } = useResizableSidebar()
  const { theme, setTheme } = useTheme()
  const unreadSupportChats = useClientNotice('unread_support_chats_count')

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-6">
        <div className="flex flex-col items-start gap-2 pl-2">
          <Logo className="h-8" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="p-4">
          <SidebarMenu>
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.url || pathname?.startsWith(item.url + '/')
              const isSupportItem = item.url === '/c/support'
              const hasUnreadSupportChats = typeof unreadSupportChats === 'number' && unreadSupportChats > 0
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={cn(
                      isActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
                    )}>
                    <Link href={item.url} className="flex w-full items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{item.title}</span>
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
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t px-4 py-4">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-sidebar-accent">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col overflow-hidden justify-center">
                  <span className="truncate text-sm font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
                {user.rating !== undefined && user.rating !== null && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold text-foreground">
                      {user.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={profileUrl}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Профиль</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme}>
                {theme === 'light' ? (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Темная тема</span>
                  </>
                ) : (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Светлая тема</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).then(() => {
                    window.location.href = '/login'
                  })
                }}>
                <span>Выход</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
      <SidebarRail onMouseDown={handleMouseDown} />
    </Sidebar>
  )
}

