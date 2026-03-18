"use client"

import * as React from "react"
import { AdministratorSidebar } from "@/packages/components/blocks-app/administrator/AdministratorSidebar"
import { AdministratorHeader } from "@/packages/components/blocks-app/administrator/AdministratorHeader"
import { AdminStateProvider } from "@/packages/components/blocks-app/app-admin/AdminStateProvider"
import RoleAuthGuard from "@/packages/components/blocks-app/guards/RoleAuthGuard"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function AdministratorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleAuthGuard allowedRoles={["administrator", "Администратор"]} redirectTo="/">
      <div className="flex h-screen w-full overflow-hidden">
        <AdminStateProvider>
          <SidebarProvider>
            <AdministratorSidebar />
            <SidebarInset className="flex flex-col flex-1 overflow-hidden">
              <AdministratorHeader />
              <main className="flex-1 overflow-y-auto p-4">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
        </AdminStateProvider>
      </div>
    </RoleAuthGuard>
  )
}
