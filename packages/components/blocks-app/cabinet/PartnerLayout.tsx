'use client'

import * as React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { PartnerSidebar } from './PartnerSidebar'
import { ConsumerHeader } from './ConsumerHeader'
import { BottomNavigation } from './BottomNavigation'
import {
  LayoutDashboard,
  FileText,
  Wallet,
  MessageSquare,
} from 'lucide-react'
import type { NavigationItem } from './BottomNavigation'

const navigationItems: NavigationItem[] = [
  {
    title: 'Дашборд',
    url: '/p/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Заявки',
    url: '/p/deals',
    icon: FileText,
  },
  {
    title: 'Выплаты',
    url: '/p/payouts',
    icon: Wallet,
  },
  {
    title: 'Поддержка',
    url: '/p/support',
    icon: MessageSquare,
  },
]

interface PartnerLayoutProps {
  children: React.ReactNode
  headerTitle?: string
  headerBreadcrumbs?: Array<{ label: string; href?: string }>
}

export function PartnerLayout({
  children,
  headerTitle,
  headerBreadcrumbs,
}: PartnerLayoutProps) {
  const [user, setUser] = React.useState<{
    name: string
    email: string
    avatar?: string
  } | null>(null)

  React.useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data: unknown) => {
        const response = data as { user?: { name?: string; email: string; avatar?: string } }
        if (response.user) {
          setUser({
            name: response.user.name || response.user.email,
            email: response.user.email,
            avatar: response.user.avatar,
          })
        }
      })
      .catch(console.error)
  }, [])

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarProvider defaultOpen={true}>
        <PartnerSidebar user={user || undefined} />
        <SidebarInset className="flex flex-col overflow-hidden">
          <ConsumerHeader title={headerTitle} breadcrumbItems={headerBreadcrumbs} />
          <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <BottomNavigation navigationItems={navigationItems} />
    </div>
  )
}

