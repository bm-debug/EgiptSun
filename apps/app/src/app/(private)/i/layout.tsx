'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { InvestorLayout } from '@/packages/components/blocks-app/cabinet/InvestorLayout'
import { AskForNotificationPush } from '@/packages/components/blocks-app/AskForNotificationPush'
import RoleAuthGuard from '@/packages/components/blocks-app/guards/RoleAuthGuard'

const getHeaderForPath = (pathname: string): {
  title: string
  breadcrumbItems?: Array<{ label: string; href?: string }>
} => {
  if (pathname === '/i/dashboard') {
    return { title: 'Портфель' }
  }
  if (pathname === '/i/wallet') {
    return { title: 'Мой кошелек' }
  }
  if (pathname === '/i/products') {
    return { title: 'Продукты' }
  }
  if (pathname === '/i/profile') {
    return { title: 'Профиль' }
  }
  if (pathname === '/i/support') {
    return { title: 'Поддержка' }
  }
  return { title: 'Кабинет Инвестора' }
}

export default function InvestorCabinetLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const header = getHeaderForPath(pathname || '')

  return (
    <RoleAuthGuard allowedRoles={['investor']} redirectTo="/">
      <div className="min-h-screen bg-background">
        <AskForNotificationPush />
        <InvestorLayout
          headerTitle={header.title}
          headerBreadcrumbs={header.breadcrumbItems}>
          {children}
        </InvestorLayout>
      </div>
    </RoleAuthGuard>
  )
}

