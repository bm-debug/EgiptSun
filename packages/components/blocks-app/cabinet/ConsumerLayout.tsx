'use client'

import * as React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import RoleAuthGuard from '@/packages/components/blocks-app/guards/RoleAuthGuard'
import { ConsumerSidebar } from './ConsumerSidebar'
import { ConsumerHeader } from './ConsumerHeader'
import { BottomNavigation } from './BottomNavigation'
import { useConsumerHeader } from './ConsumerHeaderContext'
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  MessageSquare,
} from 'lucide-react'
import type { NavigationItem } from './BottomNavigation'

const navigationItems: NavigationItem[] = [
  {
    title: 'Обзор',
    url: '/c/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Рассрочки',
    url: '/c/deals',
    icon: FileText,
  },
  // Temporarily hidden
  // {
  //   title: 'Платежи',
  //   url: '/c/payments',
  //   icon: CreditCard,
  // },
  {
    title: 'Поддержка',
    url: '/c/support',
    icon: MessageSquare,
  },
]

interface ConsumerLayoutProps {
  children: React.ReactNode
  headerTitle?: string
  headerBreadcrumbs?: Array<{ label: string; href?: string }>
}

function ConsumerLayoutInner({
  children,
  headerTitle,
  headerBreadcrumbs,
}: ConsumerLayoutProps) {
  const [user, setUser] = React.useState<{
    name: string
    email: string
    avatar?: string
    rating?: number
  } | null>(null)
  const { title: contextTitle, breadcrumbItems: contextBreadcrumbs, setTitle, setBreadcrumbItems } = useConsumerHeader()

  // Update context when props change (only if different from current context values)
  React.useEffect(() => {
    if (headerTitle !== undefined && headerTitle !== contextTitle) {
      setTitle(headerTitle)
    }
  }, [headerTitle, contextTitle, setTitle])

  React.useEffect(() => {
    if (headerBreadcrumbs !== undefined) {
      // Check if breadcrumbs are different
      const isDifferent = !contextBreadcrumbs || 
        !headerBreadcrumbs ||
        contextBreadcrumbs.length !== headerBreadcrumbs.length ||
        contextBreadcrumbs.some((item, index) => 
          item.label !== headerBreadcrumbs[index]?.label || 
          item.href !== headerBreadcrumbs[index]?.href
        )
      
      if (isDifferent) {
        setBreadcrumbItems(headerBreadcrumbs)
      }
    }
  }, [headerBreadcrumbs, contextBreadcrumbs, setBreadcrumbItems])

  React.useEffect(() => {
    // Fetch user data
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data: unknown) => {
        const response = data as { user?: { name?: string; email: string; avatar?: string; rating?: number } }
        if (response.user) {
          setUser({
            name: response.user.name || response.user.email,
            email: response.user.email,
            avatar: response.user.avatar,
            // TODO: Get rating from API when available
            // For now, using mock data - replace with response.user.rating when API is updated
            rating: response.user.rating ?? 4.8,
          })
        }
      })
      .catch(console.error)
  }, [])

  // Use context values if available, otherwise use props
  const finalTitle = contextTitle ?? headerTitle
  const finalBreadcrumbs = contextBreadcrumbs ?? headerBreadcrumbs

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarProvider defaultOpen={true}>
        <ConsumerSidebar user={user || undefined} />
        <SidebarInset className="flex flex-col overflow-hidden">
          <ConsumerHeader title={finalTitle} breadcrumbItems={finalBreadcrumbs} />
          <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <BottomNavigation navigationItems={navigationItems} />
    </div>
  )
}

export function ConsumerLayout(props: ConsumerLayoutProps) {
  return (
    <RoleAuthGuard allowedRoles={['client']} redirectTo="/login">
      <ConsumerLayoutInner {...props} />
    </RoleAuthGuard>
  )
}
