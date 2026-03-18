'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  MessageSquare,
} from 'lucide-react'
import { CabinetSidebar, type NavigationItem } from './CabinetSidebar'

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

interface InvestorSidebarProps {
  user?: {
    name: string
    email: string
    avatar?: string
  }
}

export function InvestorSidebar({ user }: InvestorSidebarProps) {
  return (
    <CabinetSidebar
      user={user}
      title="Кабинет Инвестора"
      navigationItems={navigationItems}
      profileUrl="/i/profile"
    />
  )
}

