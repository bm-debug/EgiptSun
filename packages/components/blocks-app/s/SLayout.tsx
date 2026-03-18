'use client'

import RoleAuthGuard from "@/packages/components/blocks-app/guards/RoleAuthGuard"
import React from 'react'
import { StoreKeeperProvider } from '@/contexts/StoreKeeperContext'
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { SSidebar } from "./SSidebar"
import { SHeader } from "./SHeader"

export default function SLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleAuthGuard allowedRoles={["storekeeper", "Administrator"]}>
      <StoreKeeperProvider>
        <div className="min-h-screen bg-background">
          <SidebarProvider>
            <SSidebar />
            <SidebarInset className="flex flex-col flex-1 overflow-hidden">
              <SHeader />
              <main className="flex-1 overflow-y-auto p-4">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </StoreKeeperProvider>
    </RoleAuthGuard>
  )
}