"use client"

import * as React from "react"
import { DeveloperSidebar } from "@/packages/components/blocks-app/developer/DeveloperSidebar"
import { DeveloperHeader } from "@/packages/components/blocks-app/developer/DeveloperHeader"
import { AdminStateProvider } from "@/packages/components/blocks-app/app-admin/AdminStateProvider"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AdminStateProvider>
        <SidebarProvider>
          <DeveloperSidebar />
          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <DeveloperHeader />
            <main className="flex-1 overflow-y-auto p-4">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </AdminStateProvider>
    </div>
  )
}
