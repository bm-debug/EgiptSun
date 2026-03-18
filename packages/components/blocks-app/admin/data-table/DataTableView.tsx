import * as React from "react"
import { IconLoader } from "@tabler/icons-react"
import type { ColumnFiltersState, Row, Table } from "@tanstack/react-table"
import { flexRender } from "@tanstack/react-table"
import { ColumnFilterMultiselect } from "./ColumnFilterMultiselect"
import { Input } from "@/packages/components/ui/input"
import {
  Table as TableRoot,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ColumnSchemaExtended, CollectionData } from "./types"
import { cn } from "@/lib/utils"
import { getDataInFieldLabel } from "./utils/dataInHelpers"
import BaseCollection, { OLAPSettings } from "@/shared/collections/BaseCollection"
import { LanguageCode } from "@/shared/services/i18n"
import { RTL_LOCALES } from "@/settings"
import { useOlapSettings } from "../../app-admin/AdminStateProvider"
import { useRouter } from "next/navigation"

type DataTableViewProps = {
  error: string | null
  t: any
  collectionLabel: string
  isMobile: boolean
  cardViewModeMobile: boolean
  cardViewModeDesktop: boolean
  cardsPerRow: number
  table: Table<CollectionData>
  onEditRequest: (row: Row<CollectionData>) => void
  schema: ColumnSchemaExtended[]
  translations: any
  locale: string
  collection: string
  showFilterRow: boolean
  columnFilterValues: Record<string, any>
  setColumnFilterValues: React.Dispatch<React.SetStateAction<Record<string, any>>>
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>
  columnsLength: number
  loading: boolean
  collectionConfig: BaseCollection | null
}

export function DataTableView({
  error,
  t,
  collectionLabel,
  isMobile,
  cardViewModeMobile,
  cardViewModeDesktop,
  cardsPerRow,
  table,
  onEditRequest,
  schema,
  translations,
  locale,
  collection,
  showFilterRow,
  columnFilterValues,
  setColumnFilterValues,
  setColumnFilters,
  columnsLength,
  loading,
  collectionConfig,
}: DataTableViewProps) {

  const olapSettings: OLAPSettings | null = useOlapSettings(locale as LanguageCode)

  const router = useRouter()
  const getOlapUrl = React.useMemo<(data: any) => string | null>(() => {
    if (!olapSettings) {
      return (data) => null
    }
    const altrpIndex = collectionConfig?.getAltrpIndex()
    if (!altrpIndex) {
      return (data) => null
    }


    return (data) => {
      const idx = data[altrpIndex]
      if (!idx) {
        return null
      }
      return `/admin/details/${collection}/${idx}`
    }
  }, [olapSettings, collection, collectionConfig])

  return (
    <>
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-1 text-sm text-destructive">
          Error: {error}
        </div>
      )}
      {!error && (
        <>
          {(isMobile ? cardViewModeMobile : cardViewModeDesktop) ? (
            // Card View
            <div
              className={cn(
                "grid gap-4",
                isMobile ? "grid-cols-1" : ""
              )}
              style={!isMobile ? { gridTemplateColumns: `repeat(${cardsPerRow}, minmax(0, 1fr))` } : undefined}
            >
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const olapUrl = getOlapUrl(row.original)

                  const allVisibleCells = row.getVisibleCells().filter(cell =>
                    cell.column.id !== "select" && cell.column.id !== "actions"
                  )
                  // Separate title cell for header - prioritize title, fallback to name only if title is not available
                  const titleCell = allVisibleCells.find(cell => cell.column.id === "title")
                  // Use title if available, otherwise don't use name (user wants title, not name)
                  const headerCell = titleCell || null
                  // Filter out title from body cells (title goes to header), but keep name in body
                  const visibleCells = allVisibleCells.filter(cell =>
                    cell.column.id !== "title"
                  )
                  const actionsCell = row.getVisibleCells().find(cell => cell.column.id === "actions")
                  const selectCell = row.getVisibleCells().find(cell => cell.column.id === "select")

                  return (
                    <div
                      key={row.id}
                      className="rounded-lg border bg-card p-3 space-y-2"
                      onDoubleClick={() => onEditRequest(row)}
                    >
                      {/* Header with checkbox, title and actions */}
                      <div className="flex items-center justify-between pb-2 border-b gap-2">
                        {selectCell && (
                          <div className="-ml-2 flex items-center">
                            {flexRender(selectCell.column.columnDef.cell, selectCell.getContext())}
                          </div>
                        )}
                        {headerCell && (() => {
                          // For card header, if title is JSON field with title/value structure, use title
                          const rowData = row.original
                          const titleValue = rowData?.title
                          let displayTitle: React.ReactNode = null
                          if (titleValue && typeof titleValue === "string") {
                            try {
                              const parsed = JSON.parse(titleValue)
                              if (parsed && typeof parsed === "object") {
                                const localeValue = parsed[locale] || parsed.en || parsed.ru || parsed.rs || null
                                if (localeValue && typeof localeValue === "object" && "title" in localeValue) {
                                  // Use title for card header
                                  displayTitle = localeValue.title != null ? String(localeValue.title) : null
                                }
                              }
                            } catch (e) {
                              // Not JSON, use as is
                            }
                          }

                          // If we didn't extract title from JSON, use normal cell render
                          if (displayTitle === null) {
                            displayTitle = flexRender(headerCell.column.columnDef.cell, headerCell.getContext())
                          }

                          return (
                            <div className="flex-1 font-semibold text-base truncate">
                              {displayTitle}
                            </div>
                          )
                        })()}
                        {actionsCell && (
                          <div className="ml-auto">
                            {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
                          </div>
                        )}
                      </div>
                      {/* Card content - fields on left, values on right */}
                      <div className="space-y-2">
                        {visibleCells.map((cell) => {
                          // Extract baseKey for data_in fields
                          const isDataInField = cell.column.id.startsWith("data_in.")
                          const baseKey = isDataInField ? cell.column.id.replace("data_in.", "") : null

                          const columnSchema = schema.find((col) => {
                            if (isDataInField) {
                              return false
                            }
                            return col.name === cell.column.id
                          })

                          // For data_in fields, use unified function to get label
                          let fieldLabel: string
                          if (isDataInField && baseKey) {
                            // Use unified function to get field label
                            const rowData = row.original
                            const dataInLabel = getDataInFieldLabel(baseKey, rowData, locale, translations, collection)
                            // Use label from function, or fallback to baseKey only if absolutely necessary
                            fieldLabel = dataInLabel || baseKey
                          } else {
                            // For regular fields
                            const columnTitle = columnSchema?.title || cell.column.id
                            const dataTableFieldTitle = (translations as any)?.dataTable?.fields?.[collection]?.[cell.column.id]
                            fieldLabel = dataTableFieldTitle || columnTitle
                          }

                          return (
                            <div key={cell.id} className="flex items-center gap-2 text-sm min-w-0">
                              <div className="font-medium text-muted-foreground min-w-[120px] shrink-0 text-start">
                                {fieldLabel}:
                              </div>
                              <div className="min-w-0 flex-1 truncate text-start">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
                  {t.noDataFound.replace("{collection}", collectionLabel)}
                </div>
              )}
            </div>
          ) : (
            // Table View
            <div className="overflow-x-auto rounded-lg border bg-card" dir={RTL_LOCALES.includes(locale) ? "rtl" : undefined}>
              <TableRoot
                dir={RTL_LOCALES.includes(locale) ? "rtl" : undefined}
                className="table-fixed min-w-full"
                style={{ width: `${table.getTotalSize()}px` }}
              >
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const canResize = header.column.getCanResize()
                        const isResizing = header.column.getIsResizing()
                        return (
                          <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            className={header.column.id === "actions" ? "p-0 pe-0 lg:static sticky start-0 top-0 z-20 bg-muted/50" : header.column.id === "select" ? "p-0 ps-0" : ""}
                            style={{
                              width: header.getSize(),
                              position: (header.column.id === "actions" || header.column.id === "select") ? "sticky" : "relative",
                              insetInlineStart: header.column.id === "select" ? 0 : undefined,
                              insetInlineEnd: header.column.id === "actions" ? 0 : undefined,
                            }}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            {canResize && (
                              <div
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                className={`absolute top-0 end-0 h-full w-1 cursor-col-resize select-none touch-none ${isResizing ? "bg-primary" : "bg-transparent hover:bg-primary/50"
                                  }`}
                                style={{ userSelect: "none" }}
                              />
                            )}
                          </TableHead>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                {/* Filter row - show filter inputs under headers */}
                {showFilterRow && table.getHeaderGroups().length > 0 && (
                  <thead className="bg-muted/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={`filter-${headerGroup.id}`}>
                        {headerGroup.headers.map((header) => {
                          const columnId = header.column.id

                          // Skip filter for row selection and actions columns
                          if (columnId === "select" || columnId === "actions") {
                            return (
                              <TableHead key={`filter-${header.id}`} className="p-0">
                                {header.isPlaceholder ? null : <div />}
                              </TableHead>
                            )
                          }

                          // Find column schema to determine filter type
                          const colSchema = schema.find((col) => {
                            if (columnId.startsWith("data_in.")) {
                              return false // data_in columns handled separately
                            }
                            return col.name === columnId
                          })

                          // Determine if this is a multiselect field
                          const isMultiselect = colSchema && (
                            (colSchema.fieldType === "select" && colSchema.selectOptions) ||
                            (colSchema.fieldType === "enum" && colSchema.enum) ||
                            colSchema.fieldType === "array" ||
                            (colSchema as any).multiple === true
                          )

                          // Get options for multiselect
                          let multiselectOptions: Array<{ value: string; label: string }> = []
                          if (isMultiselect) {
                            if (colSchema.fieldType === "select" && colSchema.selectOptions) {
                              multiselectOptions = colSchema.selectOptions
                            } else if (colSchema.fieldType === "enum" && colSchema.enum) {
                              multiselectOptions = colSchema.enum.values.map((val, idx) => ({
                                value: val,
                                label: colSchema.enum!.labels[idx] || val,
                              }))
                            }
                          }

                          // Get current filter value (array for multiselect, string for text)
                          const currentFilterValue = columnFilterValues[columnId]
                          const multiselectValue = isMultiselect
                            ? (Array.isArray(currentFilterValue) ? currentFilterValue : [])
                            : []
                          const textValue = !isMultiselect
                            ? (typeof currentFilterValue === "string" ? currentFilterValue : "")
                            : ""

                          return (
                            <TableHead key={`filter-${header.id}`} className="p-1">
                              {header.isPlaceholder ? null : (
                                <div className="flex items-center justify-center">
                                  {isMultiselect && multiselectOptions.length > 0 ? (
                                    <ColumnFilterMultiselect
                                      options={multiselectOptions}
                                      value={multiselectValue}
                                      translations={translations}
                                      onValueChange={(values) => {
                                        setColumnFilterValues(prev => ({
                                          ...prev,
                                          [columnId]: values,
                                        }))
                                        // Update columnFilters state
                                        if (values.length > 0) {
                                          setColumnFilters(prev => {
                                            const existing = prev.find(f => f.id === columnId)
                                            if (existing) {
                                              return prev.map(f =>
                                                f.id === columnId
                                                  ? { ...f, value: values }
                                                  : f
                                              )
                                            }
                                            return [...prev, { id: columnId, value: values }]
                                          })
                                        } else {
                                          setColumnFilters(prev => prev.filter(f => f.id !== columnId))
                                        }
                                      }}
                                      placeholder={(translations as any)?.dataTable?.filterPlaceholder || "Filter..."}
                                    />
                                  ) : (
                                    <Input
                                      placeholder={(translations as any)?.dataTable?.filterPlaceholder || "Filter..."}
                                      value={textValue}
                                      onChange={(e) => {
                                        const value = e.target.value
                                        setColumnFilterValues(prev => ({
                                          ...prev,
                                          [columnId]: value,
                                        }))
                                        // Update columnFilters state
                                        if (value) {
                                          setColumnFilters(prev => {
                                            const existing = prev.find(f => f.id === columnId)
                                            if (existing) {
                                              return prev.map(f =>
                                                f.id === columnId
                                                  ? { ...f, value }
                                                  : f
                                              )
                                            }
                                            return [...prev, { id: columnId, value }]
                                          })
                                        } else {
                                          setColumnFilters(prev => prev.filter(f => f.id !== columnId))
                                        }
                                      }}
                                      className="h-7 text-xs"
                                      size={1}
                                    />
                                  )}
                                </div>
                              )}
                            </TableHead>
                          )
                        })}
                      </TableRow>
                    ))}
                  </thead>
                )}
                <TableBody>
                  {loading ?
                    (
                      <TableRow
                        key={`loading`}
                        className="cursor-pointer bg-card"
                      ><TableCell
                        className="bg-card py-4 text-center"
                        colSpan={Math.max(1, table.getVisibleLeafColumns().length)}
                      >
                          <div className="flex items-center justify-center py-4">
                            <IconLoader className="size-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">
                              {t.loading ? t.loading.replace("{collection}", collectionLabel) : `Loading ${collectionLabel}...`}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => {
                        const olapUrl = getOlapUrl(row.original)
                        return (

                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                            // onClick={() => {
                            //   const altrpIndex = collectionConfig?.getAltrpIndex()
                            //   if(typeof altrpIndex === 'string'){
                            //     const url = `/admin/details/${collection}/${row.original[altrpIndex]}`
                            //     router.push(url)
                            //   }
                            // }}
                            onAuxClick={(e) => {
                              if (e.button === 1) {
                                if (olapUrl) {
                                  window.open(olapUrl, "_blank")
                                }
                              }
                            }}
                            className="cursor-pointer bg-card"
                          >
                            {row.getVisibleCells().map((cell) => {

return (
                                <TableCell
                                  key={cell.id}
                                  onDoubleClick={() => {
                                    if(cell.column.id !== 'title' && cell.column.id !== 'id'){
                                      onEditRequest(row)
                                    }
                                  }}
                                  onClick={() => {
                                    if((cell.column.id === 'title' || cell.column.id === 'id') && olapUrl){
                                      router.push(olapUrl)
                                    }
                                  }}

                                  className={cell.column.id === "actions" ? "p-0 ps-0 lg:static sticky end-0 z-10 bg-card h-full" : cell.column.id === "select" ? "p-0 pe-0 lg:static sticky start-0 z-10 bg-card h-full" : ""}
                                  style={{
                                    width: cell.column.getSize(),
                                    position: (cell.column.id === "actions" || cell.column.id === "select") ? "sticky" : undefined,
                                    insetInlineStart: cell.column.id === "select" ? 0 : undefined,
                                    insetInlineEnd: cell.column.id === "actions" ? 0 : undefined,
                                  }}
                                >
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columnsLength}
                          className="h-24 text-center"
                        >
                          {t.noDataFound.replace("{collection}", collectionLabel)}
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </TableRoot>
            </div>
          )}
        </>
      )}
    </>
  )
}
