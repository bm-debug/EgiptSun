'use client'

import * as React from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface ConsumerHeaderProps {
  title?: string
  breadcrumbItems?: Array<{ label: string; href?: string }>
}

export function ConsumerHeader({ title, breadcrumbItems }: ConsumerHeaderProps) {
  const defaultBreadcrumbs = [
    { label: 'Кабинет Потребителя', href: '/c/dashboard' },
    ...(title ? [{ label: title }] : []),
  ]

  const finalBreadcrumbs = breadcrumbItems || defaultBreadcrumbs

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {finalBreadcrumbs.map((item, index) => {
            const isLast = index === finalBreadcrumbs.length - 1
            return (
              <React.Fragment key={index}>
                {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                <BreadcrumbItem className={index > 0 ? 'hidden md:block' : ''}>
                  {isLast ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={item.href || '#'}>{item.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}

