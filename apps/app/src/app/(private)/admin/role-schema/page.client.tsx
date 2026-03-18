"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { RoleCollectionSettings } from "@/packages/components/blocks-app/admin/role-shema-settings/RoleCollectionSettings"
import { AppSidebar } from "@/packages/components/blocks-app/admin/app-sidebar"
import { AdminHeader } from "@/packages/components/blocks-app/app-admin/AdminHeader"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useDataTableMetaState } from "@/packages/components/blocks-app/admin/data-table/state/useDataTableMetaState"

export default function RoleSchemaPageClient() {
  const searchParams = useSearchParams()
  const roleFromUrl = searchParams.get("role") ?? ""
  const { locale, translations, supportedLanguageCodes } = useDataTableMetaState("roles")
  const t = (translations as any)?.roleSchema

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarProvider resizable>
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <AdminHeader title={t?.title || "Manage Role Schema"} />
          <main className="flex-1 overflow-y-auto p-4">
            <div className="mb-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin?c=roles&p=1&ps=10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t?.backToRoles || "Back to roles"}
                </Link>
              </Button>
            </div>
            <RoleCollectionSettings
              initialRoleName={roleFromUrl}
              locale={locale}
              supportedLanguageCodes={supportedLanguageCodes}
              translations={t}
            />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
