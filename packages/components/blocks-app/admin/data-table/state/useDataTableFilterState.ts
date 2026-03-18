import * as React from "react"
import type { ColumnFiltersState } from "@tanstack/react-table"
import type { DateRange } from "react-day-picker"

export function useDataTableFilterState(collection: string) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const [dateFilter, setDateFilter] = React.useState<{
    type: "created_at" | "updated_at" | null
    range:
      | "today"
      | "yesterday"
      | "last7days"
      | "last30days"
      | "last90days"
      | "thisMonth"
      | "lastMonth"
      | "thisYear"
      | "lastYear"
      | "custom"
      | "single"
      | null
    customStart?: Date
    customEnd?: Date
    singleDate?: Date
  }>({ type: null, range: null })

  const [statusFilter, setStatusFilter] = React.useState<string[]>([])
  const [statusOptions, setStatusOptions] = React.useState<Array<{ value: string; label: string }>>([])

  const [cityFilter, setCityFilter] = React.useState<string[]>([])
  const [cityOptions, setCityOptions] = React.useState<Array<{ value: string; label: string }>>([])

  const [tempSingleDate, setTempSingleDate] = React.useState<{
    created: Date | null
    updated: Date | null
  }>({ created: null, updated: null })

  const [tempDateRange, setTempDateRange] = React.useState<{
    created: DateRange | undefined
    updated: DateRange | undefined
  }>({
    created: undefined,
    updated: undefined,
  })

  // Load status options from taxonomy (only for contractors collection)
  React.useEffect(() => {
    if (collection !== "contractors") {
      setStatusOptions([])
      setStatusFilter([])
      return
    }
  }, [collection])

  // Load city options from taxonomy (only for contractors collection)
  React.useEffect(() => {
    if (collection !== "contractors") {
      setCityOptions([])
      setCityFilter([])
      return
    }
  }, [collection])

  return {
    columnFilters,
    setColumnFilters,
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
    statusOptions,
    setStatusOptions,
    cityFilter,
    setCityFilter,
    cityOptions,
    setCityOptions,
    tempSingleDate,
    setTempSingleDate,
    tempDateRange,
    setTempDateRange,
  }
}
