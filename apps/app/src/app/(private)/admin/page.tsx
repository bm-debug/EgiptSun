"use client"

import * as React from "react"
import { AppSidebar } from "@/packages/components/blocks-app/admin/app-sidebar"
import { DataTable } from "@/packages/components/blocks-app/admin/data-table/DataTable"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AdminStateProvider, useAdminState } from "@/packages/components/blocks-app/app-admin/AdminStateProvider"
import { AdminHeader } from "@/packages/components/blocks-app/app-admin/AdminHeader"
import data from "./data.json"

function AdminContent() {
  const { state } = useAdminState()

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarProvider resizable>
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto p-4">
            <DataTable/>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

export default function AdminPage() {
  return (
    <AdminStateProvider>
      <AdminContent />
    </AdminStateProvider>
  )
}
