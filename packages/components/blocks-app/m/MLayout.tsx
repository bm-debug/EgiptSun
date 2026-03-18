'use client'

import RoleAuthGuard from "@/packages/components/blocks-app/guards/RoleAuthGuard"
import { sidebarNavItems } from '@/app/(private)/m/nav'
import React, { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ManagerProvider } from '@/contexts/ManagerContext'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { askForNotificationPermission, subscribeUserToPush } from "@/utils/pushNotifications"
import { useMe } from "@/providers/MeProvider"
const VAPID_PUBLIC_KEY = "BHLFyVZsWA-zhVKTzu9RzJUJRQ4UMEmrskTayGsNobEfmt6BwAfKvT6JcIv4lFDhKiLzEQ8JPY87Ghrr4bYbY7w"

export default function MLayout({ children }: { children: React.ReactNode }) {
    const { user } = useMe()
    const router = useRouter()
    const userName = user?.name || 'Гость'

    useEffect(() => {
      console.log('Ask for notification permission')
      askForNotificationPermission().then((result) => {
          console.log('Ask for notification permission result:', result)
          if(result === 'granted') {
            subscribeUserToPush(VAPID_PUBLIC_KEY || '').then((result) => {
              console.log('Subscribe user to push result:', result)
            })
          }
        })
    }, [])

    const handleLogout = async () => {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        })
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        router.push('/')
      }
    }
    return ( <RoleAuthGuard allowedRoles={["manager", "Administrator"]}>
      <ManagerProvider>
        <div className="">
          <div className="grid grid-cols-12  min-h-screen">
            <aside className="col-span-12 md:col-span-3 lg:col-span-2 h-full">
              <nav className="rounded-md border p-0 h-full flex flex-col">
                <div className="mb-2 flex items-center justify-center border-b py-4 ">
                  <Link href="/s">
                    <img src="/images/favicon_32.png" alt="App icon" className="h-8 w-8" />
                  </Link>
                </div>
                <ul className="space-y-1 flex-1">
                  {sidebarNavItems.map(({ href, label, Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="flex items-center gap-3 rounded px-3 py-2 hover:bg-muted"
                      >
                        <Icon className="size-4" />
                        <span>{label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="size-4 mr-3" />
                    <span>Выход</span>
                  </Button>
                </div>
              </nav>
            </aside>
  
            <div className="col-span-12 md:col-span-9 lg:col-span-10">
              <header className="mb-6 border-b pb-4 flex items-center justify-between py-4 px-6">
                <h1 className="text-2xl font-semibold h-8">store</h1>
                <div className="text-sm text-muted-foreground">{userName}</div>
              </header>
              <main role="main" className="py-4 px-6">
                {children}
              </main>
            </div>
          </div>
        </div>
      </ManagerProvider>
      </RoleAuthGuard>
      )
}