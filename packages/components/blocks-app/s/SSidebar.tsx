"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { NavUser } from "@/packages/components/blocks-app/admin/nav-user"
import { useResizableSidebar } from "@/packages/hooks/use-resizable-sidebar"
import { sidebarNavItems } from "@/app/(private)/s/nav"
import { useMe } from "@/providers/MeProvider"
import { Logo } from "@/packages/components/misc/logo/logo"

export function SSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { handleMouseDown } = useResizableSidebar()
  const { state } = useSidebar()
  const pathname = usePathname()
  const { user } = useMe()

  const navItems = sidebarNavItems.map((item) => ({
    ...item,
    isActive: pathname === item.href || pathname.startsWith(item.href + "/"),
  }))

  const isCollapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className={`border-b px-6 h-16 flex-row items-center justify-start ${isCollapsed ? "p-2" : "p-4"}`}>
        <Link href="/s" className="flex items-center gap-3">
          <Logo collapsed={isCollapsed} size="large" />
        </Link>
      </SidebarHeader>
      <SidebarContent className={isCollapsed ? "p-2" : "p-4"}>
        <SidebarMenu>
          {navItems.map((item) => {
            const Icon = item.Icon
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={item.isActive}>
                  <Link href={item.href}>
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <NavUser
            user={{
              name: user.name || user.email || "User",
              email: user.email || "",
              avatar: "/images/avatar-placeholder.svg",
            }}
          />
        )}
      </SidebarFooter>
      <SidebarRail onMouseDown={handleMouseDown} />
    </Sidebar>
  )
}

