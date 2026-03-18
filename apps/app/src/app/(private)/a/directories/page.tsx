"use client"

import * as React from "react"
import { AppSidebar } from "@/packages/components/blocks-app/admin/app-sidebar"
import { DataTable } from "@/packages/components/blocks-app/admin/data-table/DataTable"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AdminStateProvider } from "@/packages/components/blocks-app/app-admin/AdminStateProvider"

function DirectoriesContent() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4">
            <DataTable/>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

export default function DirectoriesPage() {
  return (
    <AdminStateProvider>
      <DirectoriesContent />
    </AdminStateProvider>
  )
}
