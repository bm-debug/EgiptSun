import * as React from "react"
import {
  IconCalendar,
  IconChevronDown,
  IconDeviceFloppy,
  IconDownload,
  IconPlus,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react"
import { Calendar } from "@/components/ui/calendar"
import { DateRange, type Locale as DayPickerLocale } from "react-day-picker"
import { format } from "date-fns"
import type { Locale } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { PROJECT_SETTINGS } from "@/settings"
import { SmartSearch } from "./SmartSearch"
import { DataTableColumnSettings, type DataTableColumnSettingsProps } from "./DataTableColumnSettings"
import type { ExportFormat } from "@/shared/utils/table-export"
import type { SelectOption } from "./types"

type DateFilterState = {
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
}

type TempSingleDateState = {
  created: Date | null
  updated: Date | null
}

type TempDateRangeState = {
  created: DateRange | undefined
  updated: DateRange | undefined
}

type DataTableToolbarProps = {
  t: any
  dateFilter: DateFilterState
  tempSingleDate: TempSingleDateState
  setTempSingleDate: React.Dispatch<React.SetStateAction<TempSingleDateState>>
  tempDateRange: TempDateRangeState
  setTempDateRange: React.Dispatch<React.SetStateAction<TempDateRangeState>>
  dateFnsLocale: Locale
  applyDateFilter: (
    type: "created_at" | "updated_at",
    range: Exclude<DateFilterState["range"], null>,
    start?: Date,
    end?: Date,
    single?: Date
  ) => void
  clearDateFilter: () => void
  searchValue: string
  onSearchChange: (value: string) => void
  batchDeleting: boolean
  onBatchDelete: () => void
  handleExport: (format: ExportFormat) => void
  onImportOpen: () => void
  editMode: boolean
  hasUnsavedChanges: boolean
  onSaveAllChanges: () => Promise<void>
  columnSettingsProps: DataTableColumnSettingsProps
  onCreateOpen: () => void
  batchStatusOptions: SelectOption[]
  batchTypeOptions: SelectOption[]
  onBatchUpdateSelected: (changes: Record<string, any>) => Promise<void>
  batchUpdating: boolean
  batchStatusFieldName?: string
  batchTypeFieldName?: string
  batchStatusLabel?: string
  batchTypeLabel?: string
}

type DateFilterPopoverProps = Pick<
  DataTableToolbarProps,
  | "t"
  | "dateFilter"
  | "tempDateRange"
  | "setTempDateRange"
  | "dateFnsLocale"
  | "applyDateFilter"
  | "clearDateFilter"
>

function DateFilterPopover({
  t,
  dateFilter,
  tempDateRange,
  setTempDateRange,
  dateFnsLocale,
  applyDateFilter,
  clearDateFilter,
}: DateFilterPopoverProps) {
  const dateRangeDisplayFormat =
    (PROJECT_SETTINGS as unknown as { dateRangeDisplayFormat?: string }).dateRangeDisplayFormat ||
    "dd.MM.yy"
  type PresetRange = Exclude<DateFilterState["range"], null | "custom" | "single">

  const presetRanges: Array<{ value: PresetRange; label: string }> = [
    { value: "today", label: t.dateFilter?.today || "Today" },
    { value: "yesterday", label: t.dateFilter?.yesterday || "Yesterday" },
    { value: "last7days", label: t.dateFilter?.last7days || "Last 7 days" },
    { value: "last30days", label: t.dateFilter?.last30days || "Last 30 days" },
    { value: "last90days", label: t.dateFilter?.last90days || "Last 90 days" },
    { value: "thisMonth", label: t.dateFilter?.thisMonth || "This month" },
    { value: "lastMonth", label: t.dateFilter?.lastMonth || "Last month" },
    { value: "thisYear", label: t.dateFilter?.thisYear || "This year" },
    { value: "lastYear", label: t.dateFilter?.lastYear || "Last year" },
  ]

  const quickRanges: PresetRange[] = ["today", "yesterday", "last7days", "last30days", "thisMonth"]

  const [activeType, setActiveType] = React.useState<"created_at" | "updated_at">(
    (dateFilter.type ?? "created_at") as "created_at" | "updated_at"
  )
  React.useEffect(() => {
    if (dateFilter.type) setActiveType(dateFilter.type)
  }, [dateFilter.type])

  const currentRange = activeType === "created_at" ? tempDateRange.created : tempDateRange.updated
  const appliedRange =
    dateFilter.customStart && dateFilter.customEnd && dateFilter.type === activeType
      ? { from: dateFilter.customStart, to: dateFilter.customEnd }
      : null
  const presetAppliedRange = React.useMemo(() => {
    if (dateFilter.type !== activeType) return null
    if (!dateFilter.range || dateFilter.range === "custom" || dateFilter.range === "single") return null

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    switch (dateFilter.range) {
      case "today":
        return { from: todayStart, to: todayEnd }
      case "yesterday": {
        const from = new Date(todayStart)
        from.setDate(from.getDate() - 1)
        const to = new Date(todayEnd)
        to.setDate(to.getDate() - 1)
        return { from, to }
      }
      case "last7days": {
        const from = new Date(todayStart)
        from.setDate(from.getDate() - 6)
        return { from, to: todayEnd }
      }
      case "last30days": {
        const from = new Date(todayStart)
        from.setDate(from.getDate() - 29)
        return { from, to: todayEnd }
      }
      case "last90days": {
        const from = new Date(todayStart)
        from.setDate(from.getDate() - 89)
        return { from, to: todayEnd }
      }
      case "thisMonth":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
        }
      case "lastMonth":
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
        }
      case "thisYear":
        return {
          from: new Date(now.getFullYear(), 0, 1),
          to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
        }
      case "lastYear":
        return {
          from: new Date(now.getFullYear() - 1, 0, 1),
          to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
        }
      default:
        return null
    }
  }, [dateFilter.type, dateFilter.range, activeType])
  const rangeForDisplay =
    currentRange?.from && currentRange?.to
      ? { from: currentRange.from, to: currentRange.to }
      : (appliedRange ?? presetAppliedRange)
  const displayRange = rangeForDisplay
    ? `${format(rangeForDisplay.from, dateRangeDisplayFormat, { locale: dateFnsLocale })} - ${format(rangeForDisplay.to, dateRangeDisplayFormat, { locale: dateFnsLocale })}`
    : null
  const activePresetValue =
    dateFilter.type === activeType &&
    dateFilter.range &&
    dateFilter.range !== "custom" &&
    dateFilter.range !== "single"
      ? dateFilter.range
      : "custom"

  const applyPresetRange = (range: PresetRange) => {
    setTempDateRange((prev) => ({
      ...prev,
      [activeType === "created_at" ? "created" : "updated"]: undefined,
    }))
    applyDateFilter(activeType, range)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-start text-left font-normal w-[200px] sm:w-[220px] h-8 text-sm bg-background border-input gap-1.5"
        >
          <IconCalendar className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {displayRange ?? (t.dateFilter?.filter || "Select date range")}
          </span>
          {dateFilter.type && dateFilter.range && (
            <span
              role="button"
              aria-label={t.dateFilter?.clear || "Clear filter"}
              className="ml-auto inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm opacity-60 transition-opacity hover:opacity-100 pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation()
                clearDateFilter()
              }}
            >
              <IconX className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col">
          <div className="flex border-b px-2 pt-1.5">
            <button
              type="button"
              onClick={() => setActiveType("created_at")}
              className={cn(
                "px-2 py-1 text-xs font-medium transition-colors",
                activeType === "created_at"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.dateFilter?.created || "Created"}
            </button>
            <button
              type="button"
              onClick={() => setActiveType("updated_at")}
              className={cn(
                "px-2 py-1 text-xs font-medium transition-colors",
                activeType === "updated_at"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.dateFilter?.updated || "Updated"}
            </button>
          </div>
          <div className="p-1.5">
            <Select
              value={activePresetValue}
              onValueChange={(value) => {
                if (value === "custom") return
                applyPresetRange(value as PresetRange)
              }}
            >
              <SelectTrigger size="sm" className="mb-2 h-8 w-full text-xs">
                <SelectValue placeholder={t.dateFilter?.quickRanges || "Quick ranges"} />
              </SelectTrigger>
              <SelectContent>
                {presetRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Calendar
              mode="range"
              defaultMonth={(currentRange ?? appliedRange ?? presetAppliedRange)?.from}
              selected={currentRange ?? appliedRange ?? presetAppliedRange ?? undefined}
              onSelect={(range) => {
                setTempDateRange((prev) => ({
                  ...prev,
                  [activeType === "created_at" ? "created" : "updated"]: range,
                }))
                if (range?.from && range?.to) {
                  applyDateFilter(activeType, "custom", range.from, range.to)
                }
              }}
              locale={dateFnsLocale as unknown as DayPickerLocale}
              numberOfMonths={2}
              className="bg-transparent"
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {quickRanges.map((range) => {
                const isActive = activePresetValue === range
                const label = presetRanges.find((item) => item.value === range)?.label ?? range
                return (
                  <Button
                    key={range}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => applyPresetRange(range)}
                  >
                    {label}
                  </Button>
                )
              })}
            </div>
          </div>
          {dateFilter.type && dateFilter.range && (
            <div className="border-t px-2 py-1.5">
              <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={clearDateFilter}>
                {t.dateFilter?.clear || "Clear filter"}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function DataTableToolbar({
  t,
  dateFilter,
  tempSingleDate,
  setTempSingleDate,
  tempDateRange,
  setTempDateRange,
  dateFnsLocale,
  applyDateFilter,
  clearDateFilter,
  searchValue,
  onSearchChange,
  batchDeleting,
  onBatchDelete,
  handleExport,
  onImportOpen,
  editMode,
  hasUnsavedChanges,
  onSaveAllChanges,
  columnSettingsProps,
  onCreateOpen,
  batchStatusOptions,
  batchTypeOptions,
  onBatchUpdateSelected,
  batchUpdating,
  batchStatusFieldName,
  batchTypeFieldName,
  batchStatusLabel,
  batchTypeLabel,
}: DataTableToolbarProps) {
  const { table } = columnSettingsProps
  const selectedRowsCount = table.getFilteredSelectedRowModel().rows.length
  const filteredRowsCount = table.getFilteredRowModel().rows.length
  const [batchStatusValue, setBatchStatusValue] = React.useState("")
  const [batchTypeValue, setBatchTypeValue] = React.useState("")

  React.useEffect(() => {
    if (selectedRowsCount === 0) {
      setBatchStatusValue("")
      setBatchTypeValue("")
    }
  }, [selectedRowsCount])

  const canApplyBatchUpdate = React.useMemo(() => {
    return selectedRowsCount > 0 && (batchStatusValue !== "" || batchTypeValue !== "")
  }, [selectedRowsCount, batchStatusValue, batchTypeValue])
  const selectedText = React.useMemo(() => {
    const template = t.selectedRecords || "{count} selected · {total} total records"
    return template
      .replace("{count}", String(selectedRowsCount))
      .replace("{total}", String(filteredRowsCount))
  }, [t.selectedRecords, selectedRowsCount, filteredRowsCount])

  const handleBatchApply = React.useCallback(async () => {
    const changes: Record<string, any> = {}
    if (batchStatusFieldName && batchStatusValue !== "") {
      changes[batchStatusFieldName] = batchStatusValue
    }
    if (batchTypeFieldName && batchTypeValue !== "") {
      changes[batchTypeFieldName] = batchTypeValue
    }
    if (Object.keys(changes).length === 0) return
    await onBatchUpdateSelected(changes)
    setBatchStatusValue("")
    setBatchTypeValue("")
  }, [batchStatusFieldName, batchStatusValue, batchTypeFieldName, batchTypeValue, onBatchUpdateSelected])

  return (
    <div className="flex items-center gap-2 px-0">
      {selectedRowsCount > 0 ? (
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {selectedText}
          </span>
          {batchStatusFieldName && batchStatusOptions.length > 0 && (
            <Select value={batchStatusValue} onValueChange={setBatchStatusValue}>
              <SelectTrigger className="h-9 w-[200px] bg-background">
                <SelectValue placeholder={(t.form?.select || "Select {field}").replace("{field}", batchStatusLabel || batchStatusFieldName)} />
              </SelectTrigger>
              <SelectContent>
                {batchStatusOptions.map((opt) => (
                  <SelectItem key={`batch-status-${opt.value}`} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {batchTypeFieldName && batchTypeOptions.length > 0 && (
            <Select value={batchTypeValue} onValueChange={setBatchTypeValue}>
              <SelectTrigger className="h-9 w-[200px] bg-background">
                <SelectValue placeholder={(t.form?.select || "Select {field}").replace("{field}", batchTypeLabel || batchTypeFieldName)} />
              </SelectTrigger>
              <SelectContent>
                {batchTypeOptions.map((opt) => (
                  <SelectItem key={`batch-type-${opt.value}`} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            disabled={!canApplyBatchUpdate || batchUpdating}
            onClick={() => {
              void handleBatchApply()
            }}
          >
            {batchUpdating ? (t.form?.loading || "Loading...") : (t.form?.save || "Save")}
          </Button>
        </div>
      ) : (
        <>
          {/* Date Filter - compact shadcn-style */}
          <DateFilterPopover
            t={t}
            dateFilter={dateFilter}
            tempDateRange={tempDateRange}
            setTempDateRange={setTempDateRange}
            dateFnsLocale={dateFnsLocale}
            applyDateFilter={applyDateFilter}
            clearDateFilter={clearDateFilter}
          />

          <SmartSearch
            value={searchValue}
            onChange={onSearchChange}
            placeholder={t.search}
          />
        </>
      )}

      <Label htmlFor="view-selector" className="sr-only">
        View
      </Label>
      <div className="flex items-center gap-1 lg:gap-2 ml-auto">
        {selectedRowsCount > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="h-9"
            onClick={onBatchDelete}
            disabled={batchDeleting}
          >
            <IconTrash />
            <span className="hidden lg:inline">{t.delete?.selected || "Delete Selected"}</span>
          </Button>
        )}
        <div className="hidden lg:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-card h-9">
                <IconDownload />
                <span className="hidden lg:inline">{t.export}</span>
                <IconChevronDown className="hidden lg:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("xls")}>
                Excel (XLS)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>
                JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("sql")}>
                SQL
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onImportOpen}>
                <IconUpload className="mr-2 h-4 w-4" />
                {t.import}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Save button - only show in edit mode */}
          {editMode && hasUnsavedChanges && (
            <Button
              variant="outline"
              size="sm"
              className="bg-card h-9 ml-2"
              onClick={async () => {
                try {
                  await onSaveAllChanges()
                } catch (e) {
                  console.error("Failed to save changes:", e)
                }
              }}
            >
              <IconDeviceFloppy className="h-4 w-4" />
              <span className="hidden lg:inline">{t.save || "Save"}</span>
            </Button>
          )}
        </div>
        <DataTableColumnSettings {...columnSettingsProps} />
        <Button variant="outline" size="sm" className="bg-card h-9" onClick={onCreateOpen}>
          <IconPlus />
          <span className="hidden lg:inline">{t.add}</span>
        </Button>
      </div>
    </div>
  )
}
