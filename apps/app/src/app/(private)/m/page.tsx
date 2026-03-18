import type { Metadata } from 'next/types'
import React from 'react'
import Link from 'next/link'
import { sidebarNavItems } from './nav'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export default function Page() {
  return (
    <div className="">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sidebarNavItems.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Icon className="size-5 text-muted-foreground group-hover:text-primary" />
                  <span>{label}</span>
                </CardTitle>
                <CardDescription>
                  Перейти в раздел
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">/</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: 'Главная',
  }
}

