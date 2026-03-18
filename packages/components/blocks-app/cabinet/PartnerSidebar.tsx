'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  FileText,
  Wallet,
  MessageSquare,
} from 'lucide-react'
import { CabinetSidebar, type NavigationItem } from './CabinetSidebar'

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

interface PartnerSidebarProps {
  user?: {
    name: string
    email: string
    avatar?: string
  }
}

export function PartnerSidebar({ user }: PartnerSidebarProps) {
  return (
    <CabinetSidebar
      user={user}
      title="Кабинет Партнера"
      navigationItems={navigationItems}
      profileUrl="/p/profile"
    />
  )
}

