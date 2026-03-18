'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/packages/hooks/use-mobile'

export interface NavigationItem {
  title: string
  url: string
  icon: LucideIcon
}

interface BottomNavigationProps {
  navigationItems: NavigationItem[]
}

export function BottomNavigation({ navigationItems }: BottomNavigationProps) {
  const pathname = usePathname()
  const isMobile = useIsMobile()

  // Don't render on desktop
  if (!isMobile) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden safe-area-inset-bottom">
      <div className="flex h-16 items-center justify-around px-2">
        {navigationItems.map((item) => {
          const Icon = item.icon
          // Check if current path matches the navigation item
          // For exact match or paths that start with the item URL followed by /
          const isActive = 
            pathname === item.url || 
            (pathname?.startsWith(item.url + '/') && pathname !== item.url + '/')
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-primary'
              )}>
              <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
              <span className={cn('text-xs font-medium', isActive && 'font-semibold')}>
                {item.title}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

