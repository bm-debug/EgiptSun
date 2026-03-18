'use client'

import * as React from 'react'
import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import ConsumerAuthGuard from '@/packages/components/blocks-app/cabinet/ConsumerAuthGuard'
import { ConsumerLayout } from '@/packages/components/blocks-app/cabinet/ConsumerLayout'
import { AskForNotificationPush } from '@/packages/components/blocks-app/AskForNotificationPush'
import { ConsumerHeaderProvider, useConsumerHeader } from '@/packages/components/blocks-app/cabinet/ConsumerHeaderContext'
import { ClientNoticesProvider } from '@/packages/components/blocks-app/cabinet/ClientNoticesProvider'

const getHeaderForPath = (pathname: string): {
  title: string
  breadcrumbItems?: Array<{ label: string; href?: string }>
} => {
  if (pathname === '/c/dashboard') {
    return { title: 'Обзор' }
  }
  if (pathname === '/c/deals') {
    return { title: 'Рассрочки' }
  }
  if (pathname.startsWith('/c/deals/')) {
    if (pathname.endsWith('/edit')) {
      const match = pathname.match(/\/c\/deals\/(.+)\/edit$/)
      const dealId = match?.[1]
      return {
        title: 'Редактирование заявки',
        breadcrumbItems: [
          { label: 'Кабинет Потребителя', href: '/c/dashboard' },
          { label: 'Рассрочки', href: '/c/deals' },
          ...(dealId ? [{ label: `Сделка ${dealId}`, href: `/c/deals/${dealId}` }] : []),
          { label: 'Редактирование' },
        ],
      }
    }
    const match = pathname.match(/\/c\/deals\/(.+)$/)
    const dealId = match?.[1]
    if (dealId && dealId !== 'new') {
      return {
        title: `Сделка ${dealId}`,
        breadcrumbItems: [
          { label: 'Кабинет Потребителя', href: '/c/dashboard' },
          { label: 'Рассрочки', href: '/c/deals' },
          { label: `Сделка ${dealId}` },
        ],
      }
    }
    return { title: 'Новая заявка' }
  }
  if (pathname === '/c/payments') {
    return { title: 'Платежи' }
  }
  if (pathname === '/c/profile') {
    return { title: 'Профиль' }
  }
  if (pathname === '/c/support') {
    return { title: 'Поддержка' }
  }
  if (pathname.startsWith('/c/support/')) {
    const match = pathname.match(/\/c\/support\/(.+)$/)
    const maid = match?.[1]
    if (maid) {
      return {
        title: 'Загрузка...',
        breadcrumbItems: [
          { label: 'Кабинет Потребителя', href: '/c/dashboard' },
          { label: 'Поддержка', href: '/c/support' },
          { label: 'Загрузка...' },
        ],
      }
    }
  }
  return { title: 'Кабинет Потребителя' }
}

function ConsumerCabinetLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const header = getHeaderForPath(pathname || '')
  const { title: contextTitle, breadcrumbItems: contextBreadcrumbs, setTitle, setBreadcrumbItems } = useConsumerHeader()

  // Update header when pathname changes (but not for /c/support/[maid] as it will be updated by the page itself)
  React.useEffect(() => {
    if (!pathname?.startsWith('/c/support/') || pathname === '/c/support') {
      // Only update if different from current context values
      if (header.title !== contextTitle) {
        setTitle(header.title)
      }
      const newBreadcrumbs = header.breadcrumbItems || null
      const isDifferent = !contextBreadcrumbs || 
        !newBreadcrumbs ||
        contextBreadcrumbs.length !== newBreadcrumbs.length ||
        contextBreadcrumbs.some((item, index) => 
          item.label !== newBreadcrumbs[index]?.label || 
          item.href !== newBreadcrumbs[index]?.href
        )
      if (isDifferent) {
        setBreadcrumbItems(newBreadcrumbs)
      }
    }
  }, [pathname, header.title, header.breadcrumbItems, contextTitle, contextBreadcrumbs, setTitle, setBreadcrumbItems])

  return (
    <div className="min-h-screen bg-background">
      <ConsumerAuthGuard>
        <ClientNoticesProvider>
          <AskForNotificationPush />
          <ConsumerLayout
            headerTitle={header.title}
            headerBreadcrumbs={header.breadcrumbItems}>
            {children}
          </ConsumerLayout>
        </ClientNoticesProvider>
      </ConsumerAuthGuard>
    </div>
  )
}

export default function ConsumerCabinetLayout({ children }: { children: ReactNode }) {
  return (
    <ConsumerHeaderProvider>
      <ConsumerCabinetLayoutInner>{children}</ConsumerCabinetLayoutInner>
    </ConsumerHeaderProvider>
  )
}
