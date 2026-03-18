"use client"

import * as React from "react"
import { ReactNode } from "react"
import AdminAuthGuard from "@/packages/components/blocks-app/app-admin/AdminAuthGuard"
import { AdminStateProvider } from "@/packages/components/blocks-app/app-admin/AdminStateProvider"
import { AdminSocketProvider } from "@/packages/components/blocks-app/app-admin/AdminSocketProvider"
import { AdminNoticesProvider } from "@/packages/components/blocks-app/app-admin/AdminNoticesProvider"
import { NotificationsProvider } from "@/packages/components/blocks-app/app-admin/NotificationsContext"
import { NotificationsDrawer } from "@/packages/components/blocks-app/app-admin/NotificationsDrawer"
import { AskForNotificationPush } from "@/packages/components/blocks-app/AskForNotificationPush"
import { RTL_LOCALES } from "@/settings"

function getAdminDir(): "ltr" | "rtl" {
  if (typeof window === "undefined") return "ltr"
  const locale = localStorage.getItem("sidebar-locale")
  return locale && RTL_LOCALES.includes(locale) ? "rtl" : "ltr"
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [dir, setDir] = React.useState<"ltr" | "rtl">("ltr")

  React.useEffect(() => {
    setDir(getAdminDir())
    const handler = () => setDir(getAdminDir())
    window.addEventListener("sidebar-locale-changed", handler)
    return () => window.removeEventListener("sidebar-locale-changed", handler)
  }, [])

  React.useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.dir = dir
    return () => {
      document.documentElement.dir = "ltr"
    }
  }, [dir])

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <AdminStateProvider>
        <AdminSocketProvider>
          <AdminNoticesProvider>
            <NotificationsProvider>
              <AdminAuthGuard>
                <AskForNotificationPush />
                <main>{children}</main>
                <NotificationsDrawer />
              </AdminAuthGuard>
            </NotificationsProvider>
          </AdminNoticesProvider>
        </AdminSocketProvider>
      </AdminStateProvider>
    </div>
  )
}
