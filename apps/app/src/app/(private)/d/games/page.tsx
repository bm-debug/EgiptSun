"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AdminStateProvider, useAdminState } from "@/packages/components/blocks-app/app-admin/AdminStateProvider"
import { DataTable } from "@/packages/components/blocks-app/admin/data-table/DataTable"
import { useMe } from "@/providers/MeProvider"
import { GameFormDialog } from "@/packages/components/blocks-app/developer/GameFormDialog"

function GamesContent() {
  const { state, setState } = useAdminState()
  const router = useRouter()
  const { user } = useMe()
  const [createOpen, setCreateOpen] = React.useState(false)

  // Set collection to products and add filter for developer's games
  React.useEffect(() => {
    if (user?.humanAid) {
      setState((prev) => ({
        ...prev,
        collection: "products",
        filters: [
          {
            field: "data_in.owner",
            op: "eq",
            value: user.humanAid,
          },
        ],
      }))
    }
  }, [user?.humanAid, setState])

  // Handle row double-click to navigate to game detail
  React.useEffect(() => {
    const handleRowClick = (e: any) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      // Don't trigger on button clicks, checkboxes, or action cells
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
          // Get the first cell which should contain the ID
          const firstCellText = cells[0]?.textContent?.trim()
          if (firstCellText) {
            // Navigate to game detail page
            router.push(`/d/games/${firstCellText}`)
          }
        }
      }
    }

    const tableContainer = document.querySelector('[data-slot="data-table"]')
    if (tableContainer) {
      tableContainer.addEventListener("dblclick", handleRowClick as EventListener)
      return () => {
        tableContainer.removeEventListener("dblclick", handleRowClick as EventListener)
      }
    }
  }, [router, state.collection])

  // Override onCreateOpen in DataTable by intercepting the button click
  React.useEffect(() => {
    const handleAddButtonClick = (e: any) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const button = target.closest("button")
      if (button) {
        const buttonText = button.textContent || ""
        if (
          buttonText.includes("Add") ||
          buttonText.includes("Добавить") ||
          button.querySelector('[class*="IconPlus"]') ||
          button.querySelector('[class*="plus"]')
        ) {
          // Check if we're in the games page
          if (window.location.pathname === "/d/games") {
            e.preventDefault()
            e.stopPropagation()
            setCreateOpen(true)
          }
        }
      }
    }

    document.addEventListener("click", handleAddButtonClick, true)
    return () => {
      document.removeEventListener("click", handleAddButtonClick, true)
    }
  }, [])

  return (
    <>
      <DataTable />
      <GameFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}

export default function GamesPage() {
  return (
    <AdminStateProvider>
      <GamesContent />
    </AdminStateProvider>
  )
}
