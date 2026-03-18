"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { TesterSidebar } from "@/packages/components/blocks-app/tester/TesterSidebar"
import { TesterHeader } from "@/packages/components/blocks-app/tester/TesterHeader"
import RoleAuthGuard from "@/packages/components/blocks-app/guards/RoleAuthGuard"
import { BottomNavigation } from "@/packages/components/blocks-app/cabinet/BottomNavigation"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  ClipboardList,
  Wallet,
  User,
  MessageSquare,
} from "lucide-react"
import type { NavigationItem } from "@/packages/components/blocks-app/cabinet/BottomNavigation"

const bottomNavItems: NavigationItem[] = [
  { title: "Главная", url: "/t", icon: LayoutDashboard },
  { title: "Задания", url: "/t/tasks", icon: ClipboardList },
  { title: "Кошелёк", url: "/t/wallet", icon: Wallet },
  { title: "Профиль", url: "/t/profile", icon: User },
  { title: "Поддержка", url: "/t/support", icon: MessageSquare },
]

function getHeaderForPath(pathname: string): {
  title: string
  breadcrumbItems?: Array<{ label: string; href?: string }>
} {
  if (pathname === "/t" || pathname === "/t/dashboard") {
    return { title: "Главная" }
  }
  if (pathname === "/t/tasks") {
    return { title: "Задания", breadcrumbItems: [{ label: "Tester Portal", href: "/t" }, { label: "Задания" }] }
  }
  if (pathname?.startsWith("/t/tasks/")) {
    return {
      title: "Задание",
      breadcrumbItems: [{ label: "Tester Portal", href: "/t" }, { label: "Задания", href: "/t/tasks" }, { label: "Детали" }],
    }
  }
  if (pathname === "/t/wallet") {
    return { title: "Кошелёк", breadcrumbItems: [{ label: "Tester Portal", href: "/t" }, { label: "Кошелёк" }] }
  }
  if (pathname === "/t/profile") {
    return { title: "Профиль", breadcrumbItems: [{ label: "Tester Portal", href: "/t" }, { label: "Профиль" }] }
  }
  if (pathname === "/t/support") {
    return { title: "Поддержка", breadcrumbItems: [{ label: "Tester Portal", href: "/t" }, { label: "Поддержка" }] }
  }
  if (pathname?.match(/^\/t\/support\/[^/]+$/)) {
    return {
      title: "Обращение",
      breadcrumbItems: [{ label: "Tester Portal", href: "/t" }, { label: "Поддержка", href: "/t/support" }, { label: "Детали" }],
    }
  }
  return { title: "Портал тестировщика" }
}

export default function TesterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const header = getHeaderForPath(pathname || "")

  return (
    <RoleAuthGuard allowedRoles={["tester", "Тестер"]} redirectTo="/">
      <div className="flex h-screen w-full overflow-hidden">
        <SidebarProvider>
          <TesterSidebar />
          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <TesterHeader title={header.title} breadcrumbItems={header.breadcrumbItems} />
            <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
        <BottomNavigation navigationItems={bottomNavItems} />
      </div>
    </RoleAuthGuard>
  )
}
