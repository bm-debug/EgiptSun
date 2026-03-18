'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import RoleAuthGuard from '@/packages/components/blocks-app/guards/RoleAuthGuard'
import { PartnerLayout } from '@/packages/components/blocks-app/cabinet/PartnerLayout'
import { AskForNotificationPush } from '@/packages/components/blocks-app/AskForNotificationPush'

const PARTNER_ROLES = ['partner', 'Partner', 'Партнер']

const getHeaderForPath = (pathname: string): {
  title: string
  breadcrumbItems?: Array<{ label: string; href?: string }>
} => {
  if (pathname === '/p/dashboard') {
    return { title: 'Дашборд' }
  }
  if (pathname === '/p/deals') {
    return { title: 'Заявки' }
  }
  if (pathname === '/p/payouts') {
    return { title: 'Выплаты' }
  }
  if (pathname === '/p/profile') {
    return { title: 'Профиль магазина' }
  }
  if (pathname === '/p/support') {
    return { title: 'Поддержка' }
  }
  return { title: 'Кабинет Партнера' }
}

export default function PartnerCabinetLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const header = getHeaderForPath(pathname || '')

  return (
    <RoleAuthGuard allowedRoles={PARTNER_ROLES} redirectTo="/">
      <div className="min-h-screen bg-background">
        <AskForNotificationPush />  
        <PartnerLayout
          headerTitle={header.title}
          headerBreadcrumbs={header.breadcrumbItems}>
          {children}
        </PartnerLayout>
      </div>
    </RoleAuthGuard>
  )
}

