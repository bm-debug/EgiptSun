import * as React from "react"
import type { ColumnFiltersState } from "@tanstack/react-table"
import type { DateRange } from "react-day-picker"
import qs from "qs"
import type { StateResponse } from "../types"

type DateFilterRange =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "last90days"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear"

type FilterCallbacksParams = {
  collection: string
  locale: string
  setDateFilter: (filter: any) => void
  setTempSingleDate: (dates: { created: Date | null; updated: Date | null }) => void
  setTempDateRange: (ranges: { created: DateRange | undefined; updated: DateRange | undefined }) => void
  setColumnFilters: (updater: (prev: ColumnFiltersState) => ColumnFiltersState) => void
  setStatusFilter: (values: string[]) => void
  setCityFilter: (values: string[]) => void
  setStatusOptions: (options: Array<{ value: string; label: string }>) => void
  setCityOptions: (options: Array<{ value: string; label: string }>) => void
}

export function useDataTableFilterCallbacks({
  collection,
  locale,
  setDateFilter,
  setTempSingleDate,
  setTempDateRange,
  setColumnFilters,
  setStatusFilter,
  setCityFilter,
  setStatusOptions,
  setCityOptions,
}: FilterCallbacksParams) {
  const getDateRange = React.useCallback((range: DateFilterRange): { start: Date; end: Date } => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (range) {
      case "today":
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) }
      case "yesterday": {
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        return { start: yesterday, end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1) }
      }
      case "last7days":
        return {
          start: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        }
      case "last30days":
        return {
          start: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        }
      case "last90days":
        return {
          start: new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        }
      case "thisMonth":
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
        }
      case "lastMonth":
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
        }
      case "thisYear":
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
        }
      case "lastYear":
        return {
          start: new Date(now.getFullYear() - 1, 0, 1),
          end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
        }
      default:
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) }
    }
  }, [])

  const applyDateFilter = React.useCallback(
    (
      type: "created_at" | "updated_at",
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
        | null,
      customStart?: Date,
      customEnd?: Date,
      singleDate?: Date
    ) => {
      if (range === "custom" && (!customStart || !customEnd)) {
        return
      }
      if (range === "single" && !singleDate) {
        return
      }

      let dateRange: { start: Date; end: Date }
      if (range === "single" && singleDate) {
        const start = new Date(singleDate.getFullYear(), singleDate.getMonth(), singleDate.getDate())
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
        dateRange = { start, end }
      } else if (range === "custom" && customStart && customEnd) {
        dateRange = { start: customStart, end: customEnd }
      } else {
        dateRange = getDateRange(range as DateFilterRange)
      }

      setDateFilter({ type, range, customStart, customEnd, singleDate })

      setColumnFilters((prev) => {
        const filtered = prev.filter((f) => f.id !== "created_at" && f.id !== "updated_at")
        return [
          ...filtered,
          {
            id: type,
            value: {
              start: dateRange.start.toISOString(),
              end: dateRange.end.toISOString(),
            },
          },
        ]
      })
    },
    [getDateRange, setDateFilter, setColumnFilters]
  )

  const clearDateFilter = React.useCallback(() => {
    setDateFilter({ type: null, range: null })
    setTempSingleDate({ created: null, updated: null })
    setTempDateRange({
      created: undefined,
      updated: undefined,
    })
    setColumnFilters((prev) => prev.filter((f) => f.id !== "created_at" && f.id !== "updated_at"))
  }, [setDateFilter, setTempSingleDate, setTempDateRange, setColumnFilters])

  // Load status options from taxonomy (only for contractors collection)
  React.useEffect(() => {
    if (collection !== "contractors") {
      setStatusOptions([])
      setStatusFilter([])
      return
    }

    const loadStatusOptions = async () => {
      try {
        const queryParams = qs.stringify(
          {
            c: "taxonomy",
            p: 1,
            ps: 1000,
            filters: [
              {
                field: "entity",
                op: "eq",
                value: "Contractor",
              },
            ],
          },
          {
            arrayFormat: "brackets",
            encode: false,
          }
        )

        const res = await fetch(`/api/admin/state?${queryParams}`, {
          credentials: "include",
        })
        if (!res.ok) return

        const json: StateResponse = await res.json()
        const opts = json.data.map((item) => {
          const value = item.name
          let label: string

          let titleValue = item.title
          if (typeof titleValue === "string") {
            try {
              titleValue = JSON.parse(titleValue)
            } catch {
              // Not JSON, use as-is
            }
          }

          if (titleValue && typeof titleValue === "object") {
            label = titleValue[locale] || titleValue.en || titleValue.ru || titleValue.rs || "-"
          } else {
            label = String(titleValue || "-")
          }

          return { value, label }
        })

        setStatusOptions(opts)
      } catch (e) {
        console.error("Failed to load status options:", e)
      }
    }

    void loadStatusOptions()
  }, [collection, locale, setStatusOptions, setStatusFilter])

  // Load city options from taxonomy (only for contractors collection)
  React.useEffect(() => {
    if (collection !== "contractors") {
      setCityOptions([])
      setCityFilter([])
      return
    }

    const loadCityOptions = async () => {
      try {
        const queryParams = qs.stringify(
          {
            c: "taxonomy",
            p: 1,
            ps: 1000,
            filters: [
              {
                field: "entity",
                op: "eq",
                value: "City",
              },
            ],
          },
          {
            arrayFormat: "brackets",
            encode: false,
          }
        )

        const res = await fetch(`/api/admin/state?${queryParams}`, {
          credentials: "include",
        })
        if (!res.ok) return

        const json: StateResponse = await res.json()
        const opts = json.data.map((item) => {
          const value = item.name
          let label: string

          let titleValue = item.title
          if (typeof titleValue === "string") {
            try {
              titleValue = JSON.parse(titleValue)
            } catch {
              // Not JSON, use as-is
            }
          }

          if (titleValue && typeof titleValue === "object") {
            label = titleValue[locale] || titleValue.en || titleValue.ru || titleValue.rs || "-"
          } else {
            label = String(titleValue || "-")
          }

          return { value, label }
        })

        setCityOptions(opts)
      } catch (e) {
        console.error("Failed to load city options:", e)
      }
    }

    void loadCityOptions()
  }, [collection, locale, setCityOptions, setCityFilter])

  const applyStatusFilter = React.useCallback(
    (statusValues: string[]) => {
      setStatusFilter(statusValues)
      setColumnFilters((prev) => prev.filter((f) => f.id !== "status_name"))
    },
    [setStatusFilter, setColumnFilters]
  )

  const clearStatusFilter = React.useCallback(() => {
    setStatusFilter([])
    setColumnFilters((prev) => prev.filter((f) => f.id !== "status_name"))
  }, [setStatusFilter, setColumnFilters])

  const applyCityFilter = React.useCallback(
    (cityValues: string[]) => {
      setCityFilter(cityValues)
      setColumnFilters((prev) => prev.filter((f) => f.id !== "city_name"))
    },
    [setCityFilter, setColumnFilters]
  )

  const clearCityFilter = React.useCallback(() => {
    setCityFilter([])
    setColumnFilters((prev) => prev.filter((f) => f.id !== "city_name"))
  }, [setCityFilter, setColumnFilters])

  return {
    getDateRange,
    applyDateFilter,
    clearDateFilter,
    applyStatusFilter,
    clearStatusFilter,
    applyCityFilter,
    clearCityFilter,
  }
}
