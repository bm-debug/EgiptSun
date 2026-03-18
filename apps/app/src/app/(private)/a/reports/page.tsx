"use client"

import * as React from "react"
import { AdminStateProvider, useAdminState } from "@/packages/components/blocks-app/app-admin/AdminStateProvider"
import { DataTable } from "@/packages/components/blocks-app/admin/data-table/DataTable"
import { ReportDrawer } from "@/packages/components/blocks-app/developer/ReportDrawer"

function ReportsContent() {
  const { state, setState } = useAdminState()
  const [selectedReport, setSelectedReport] = React.useState<any | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  // Set collection to texts (all reports, no filter)
  React.useEffect(() => {
    setState((prev) => ({
      ...prev,
      collection: "texts",
      filters: [],
    }))
  }, [setState])

  // Handle row click to open drawer
  React.useEffect(() => {
    const handleRowClick = (e: any) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (
        target.closest("button") ||
        target.closest('input[type="checkbox"]') ||
        target.closest("[data-action-cell]")
      ) {
        return
      }

      const row = target.closest("tbody tr")
      if (row) {
        const cells = row.querySelectorAll("td")
        if (cells.length > 0) {
          const reportId = cells[0]?.textContent?.trim()
          if (reportId) {
            setSelectedReport({ id: reportId })
            setDrawerOpen(true)
          }
        }
      }
    }

    const tableContainer = document.querySelector('[data-slot="data-table"]')
    if (tableContainer) {
      tableContainer.addEventListener("click", handleRowClick as EventListener)
      return () => {
        tableContainer.removeEventListener("click", handleRowClick as EventListener)
      }
    }
  }, [state.collection])

  return (
    <>
      <DataTable />
      <ReportDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        report={selectedReport}
      />
    </>
  )
}

export default function ReportsPage() {
  return (
    <AdminStateProvider>
      <ReportsContent />
    </AdminStateProvider>
  )
}
