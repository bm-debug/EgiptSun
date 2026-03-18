"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AdminStateProvider, useAdminState } from "@/packages/components/blocks-app/app-admin/AdminStateProvider"
import { DataTable } from "@/packages/components/blocks-app/admin/data-table/DataTable"
import { GameFormDialog } from "@/packages/components/blocks-app/developer/GameFormDialog"

function GamesContent() {
  const { state, setState } = useAdminState()
  const router = useRouter()
  const [createOpen, setCreateOpen] = React.useState(false)

  // Set collection to products (all games, no filter)
  React.useEffect(() => {
    setState((prev) => ({
      ...prev,
      collection: "products",
      filters: [],
    }))
  }, [setState])

  // Handle row double-click to navigate to game detail
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
          const firstCellText = cells[0]?.textContent?.trim()
          if (firstCellText) {
            router.push(`/a/games/${firstCellText}`)
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
          if (window.location.pathname === "/a/games") {
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
