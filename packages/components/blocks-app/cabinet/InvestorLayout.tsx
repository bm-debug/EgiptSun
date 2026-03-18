'use client'

import * as React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { InvestorSidebar } from './InvestorSidebar'
import { ConsumerHeader } from './ConsumerHeader'
import { BottomNavigation } from './BottomNavigation'
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  MessageSquare,
} from 'lucide-react'
import type { NavigationItem } from './BottomNavigation'

const navigationItems: NavigationItem[] = [
  {
    title: 'Портфель',
    url: '/i/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Мой кошелек',
    url: '/i/wallet',
    icon: Wallet,
  },
  {
    title: 'Продукты',
    url: '/i/products',
    icon: TrendingUp,
  },
  {
    title: 'Поддержка',
    url: '/i/support',
    icon: MessageSquare,
  },
]

interface InvestorLayoutProps {
  children: React.ReactNode
  headerTitle?: string
  headerBreadcrumbs?: Array<{ label: string; href?: string }>
}

export function InvestorLayout({
  children,
  headerTitle,
  headerBreadcrumbs,
}: InvestorLayoutProps) {
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
        <InvestorSidebar user={user || undefined} />
        <SidebarInset className="flex flex-col overflow-hidden">
          <ConsumerHeader title={headerTitle} breadcrumbItems={headerBreadcrumbs} />
          <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <BottomNavigation navigationItems={navigationItems} />
    </div>
  )
}

