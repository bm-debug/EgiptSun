'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  MessageSquare,
} from 'lucide-react'
import { CabinetSidebar, type NavigationItem } from './CabinetSidebar'

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

interface ConsumerSidebarProps {
  user?: {
    name: string
    email: string
    avatar?: string
    rating?: number
  }
}

export function ConsumerSidebar({ user }: ConsumerSidebarProps) {
  return (
    <CabinetSidebar
      user={user}
      title="Кабинет Потребителя"
      navigationItems={navigationItems}
      profileUrl="/c/profile"
    />
  )
}
