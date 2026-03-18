import * as React from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Table } from "@tanstack/react-table"
import type { CollectionData } from "./types"

type DataTablePaginationProps = {
  t: any
  table: Table<CollectionData>
  total: number
  totalPages: number
  currentPage: number
  setDefaultPageSize: React.Dispatch<React.SetStateAction<number>>
}

export function DataTablePagination({
  t,
  table,
  total,
  totalPages,
  currentPage,
  setDefaultPageSize,
}: DataTablePaginationProps) {
  const selectedRecordsText = (t?.selectedRecords ?? "{count} selected · {total} total records")
    .replace("{count}", String(table.getFilteredSelectedRowModel().rows.length))
    .replace("{total}", String(total))
  const pageText = (t?.page ?? "Page {page} of {total}")
    .replace("{page}", String(currentPage))
    .replace("{total}", String(totalPages || 1))
  const rowsPerPageLabel = t?.rowsPerPage ?? "Rows per page"

  return (
    <div className="flex items-center justify-between px-0">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        {selectedRecordsText}
      </div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium text-start">
            {rowsPerPageLabel}
          </Label>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              const pageSize = Number(value)
              table.setPageSize(pageSize)
              // Also update default page size
              setDefaultPageSize(pageSize)
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue
                placeholder={table.getState().pagination.pageSize}
              />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          {pageText}
        </div>
        <div className="ms-auto flex items-center gap-2 lg:ms-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={currentPage === 1}
          >
            <span className="sr-only">Go to first page</span>
            <IconChevronsLeft className="rtl:rotate-180" />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={currentPage === 1}
          >
            <span className="sr-only">Go to previous page</span>
            <IconChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={currentPage >= totalPages}
          >
            <span className="sr-only">Go to next page</span>
            <IconChevronRight className="rtl:rotate-180" />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => table.setPageIndex(totalPages - 1)}
            disabled={currentPage >= totalPages}
          >
            <span className="sr-only">Go to last page</span>
            <IconChevronsRight className="rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  )
}
