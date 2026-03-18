import * as React from "react"
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconCheck,
  IconChevronDown,
  IconEdit,
  IconGripVertical,
  IconLayoutColumns,
  IconLayoutGrid,
  IconX,
} from "@tabler/icons-react"
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/packages/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type {
  ColumnSchemaExtended,
  CollectionData,
} from "./types"
import type {
  PaginationState,
  SortingState,
  Table,
  VisibilityState,
} from "@tanstack/react-table"

export type DataTableColumnSettingsProps = {
  table: Table<CollectionData>
  data: CollectionData[]
  schema: ColumnSchemaExtended[]
  translations: any
  t: any
  locale: string
  supportedLanguageCodes: string[]
  collection: string
  columnOrder: string[]
  setColumnOrder: React.Dispatch<React.SetStateAction<string[]>>
  columnVisibility: VisibilityState
  setColumnVisibility: React.Dispatch<React.SetStateAction<VisibilityState>>
  sorting: SortingState
  setSorting: React.Dispatch<React.SetStateAction<SortingState>>
  defaultSorting: SortingState
  columnSizing: Record<string, number>
  setColumnSizing: React.Dispatch<React.SetStateAction<Record<string, number>>>
  columnAlignment: Record<string, "left" | "center" | "right">
  setColumnAlignment: React.Dispatch<React.SetStateAction<Record<string, "left" | "center" | "right">>>
  defaultPageSize: number
  setDefaultPageSize: React.Dispatch<React.SetStateAction<number>>
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>
  setState: React.Dispatch<React.SetStateAction<any>>
  editMode: boolean
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>
  isMobile: boolean
  cardViewModeMobile: boolean
  setCardViewModeMobile: React.Dispatch<React.SetStateAction<boolean>>
  cardViewModeDesktop: boolean
  setCardViewModeDesktop: React.Dispatch<React.SetStateAction<boolean>>
  cardsPerRow: number
  setCardsPerRow: React.Dispatch<React.SetStateAction<number>>
}

type ColumnWidthInputProps = {
  columnId: string
  currentSize?: number
  columnSizing: Record<string, number>
  setColumnSizing: React.Dispatch<React.SetStateAction<Record<string, number>>>
  placeholder: string
}

function ColumnWidthInput({
  columnId,
  currentSize,
  columnSizing,
  setColumnSizing,
  placeholder,
}: ColumnWidthInputProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [draftValue, setDraftValue] = React.useState<string>(
    currentSize ? String(Math.round(currentSize)) : (columnSizing?.[columnId] ? String(columnSizing[columnId]) : "")
  )

  React.useEffect(() => {
    if (isEditing) return
    if (currentSize && Number.isFinite(currentSize)) {
      setDraftValue(String(Math.round(currentSize)))
      return
    }
    setDraftValue(columnSizing?.[columnId] ? String(columnSizing[columnId]) : "")
  }, [columnId, currentSize, columnSizing, isEditing])

  const commit = React.useCallback((rawValue: string) => {
    const parsedValue = rawValue.trim() === "" ? undefined : parseInt(rawValue, 10)
    if (parsedValue && parsedValue > 0) {
      setColumnSizing((prev) => ({ ...prev, [columnId]: parsedValue }))
      return
    }
    setColumnSizing((prev) => {
      const next = { ...prev }
      delete next[columnId]
      return next
    })
  }, [columnId, setColumnSizing])

  return (
    <Input
      type="number"
      min="20"
      max="1000"
      value={draftValue}
      onChange={(e) => {
        setDraftValue(e.target.value)
      }}
      onFocus={() => setIsEditing(true)}
      onBlur={(e) => {
        setIsEditing(false)
        commit(e.currentTarget.value)
      }}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === "Enter") {
          e.preventDefault()
          setIsEditing(false)
          commit(e.currentTarget.value)
          ;(e.currentTarget as HTMLInputElement).blur()
        }
      }}
      placeholder={placeholder}
      className="h-8 text-xs"
    />
  )
}

export function DataTableColumnSettings({
  table,
  data,
  schema,
  translations,
  t,
  locale,
  supportedLanguageCodes,
  collection,
  columnOrder,
  setColumnOrder,
  columnVisibility,
  setColumnVisibility,
  sorting,
  setSorting,
  defaultSorting,
  columnSizing,
  setColumnSizing,
  columnAlignment,
  setColumnAlignment,
  defaultPageSize,
  setDefaultPageSize,
  setPagination,
  setState,
  editMode,
  setEditMode,
  isMobile,
  cardViewModeMobile,
  setCardViewModeMobile,
  cardViewModeDesktop,
  setCardViewModeDesktop,
  cardsPerRow,
  setCardsPerRow,
}: DataTableColumnSettingsProps) {
  const getSafeColumnSize = React.useCallback((columnId: string): number | undefined => {
    const column = table.getAllColumns().find((col) => col.id === columnId)
    return column?.getSize()
  }, [table])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function SortableColumnItem({ id, children }: { id: string; children: React.ReactNode }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <div className="flex items-center gap-1">
          <div
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          >
            <IconGripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          {children}
        </div>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="bg-card h-9">
          <IconLayoutColumns />
          <span className="hidden lg:inline">{t.configureTable}</span>
          <IconChevronDown className="hidden lg:inline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-[80vh] lg:max-h-[400px] overflow-y-auto">
        {(() => {
          // Get all columns (schema + data_in) for drag-and-drop
          const allTableColumns = table.getAllColumns()
          const schemaColumns = allTableColumns.filter(
            (column) => {
              // Must have an id
              if (!column.id) return false
              // Exclude system columns
              if (column.id === "select" || column.id === "actions") return false
              // Exclude data_in columns (they are handled separately)
              if (column.id.startsWith("data_in.")) return false
              // Must have either accessorFn or accessorKey (data columns)
              const hasAccessor = typeof column.accessorFn !== "undefined" || "accessorKey" in column
              // Include all columns with accessors (don't check canHide as it might exclude valid columns)
              return hasAccessor
            }
          )

          // Get data_in columns
          const allDataInKeys = new Set<string>()
          data.forEach((row) => {
            const dataIn = row.data_in
            if (dataIn) {
              try {
                let parsed: any = dataIn
                if (typeof dataIn === "string") {
                  try {
                    parsed = JSON.parse(dataIn)
                  } catch (e) {
                    return
                  }
                }
                if (parsed && typeof parsed === "object") {
                  Object.keys(parsed).forEach((key) => {
                    const langMatch = key.match(/^(.+)_([a-z]{2})$/i)
                    if (langMatch && supportedLanguageCodes.includes(langMatch[2].toLowerCase())) {
                      allDataInKeys.add(langMatch[1])
                    } else {
                      allDataInKeys.add(key)
                    }
                  })
                }
              } catch (e) {
                // Ignore
              }
            }
          })

          const dataInColumnIds = Array.from(allDataInKeys).map((baseKey) => `data_in.${baseKey}`)

          // Combine all column IDs
          // Get all schema column IDs (use id if available, otherwise use accessorKey or accessorFn result)
          const schemaColumnIds = schemaColumns
            .map((col) => {
              if (col.id) return col.id
              // TanStack Table uses accessorKey as id if id is not set
              if ("accessorKey" in col && col.accessorKey) return col.accessorKey as string
              return null
            })
            .filter((id): id is string => !!id)

          const allColumnIds = [
            ...schemaColumnIds,
            ...dataInColumnIds,
          ]

          // Apply saved order or use default
          const orderedColumnIds = columnOrder.length > 0
            ? (() => {
              const ordered: string[] = []
              const unordered: string[] = []
              const orderSet = new Set(columnOrder)

              // Add columns in saved order
              columnOrder.forEach((id) => {
                if (allColumnIds.includes(id)) {
                  ordered.push(id)
                }
              })

              // Add remaining columns
              allColumnIds.forEach((id) => {
                if (!orderSet.has(id)) {
                  unordered.push(id)
                }
              })

              return [...ordered, ...unordered]
            })()
            : allColumnIds

          const handleDragEnd = (event: DragEndEvent) => {
            const { active, over } = event

            if (over && active.id !== over.id) {
              const oldIndex = orderedColumnIds.indexOf(active.id as string)
              const newIndex = orderedColumnIds.indexOf(over.id as string)

              if (oldIndex !== -1 && newIndex !== -1) {
                // Move the dragged column in the ordered list
                const newOrderedIds = arrayMove(orderedColumnIds, oldIndex, newIndex)

                // Merge with existing columnOrder to preserve columns not in the drag list
                // This ensures we don't lose columns that might not be in orderedColumnIds
                const existingOrderSet = new Set(columnOrder)
                const newOrderSet = new Set(newOrderedIds)

                // Start with the new order
                const finalOrder = [...newOrderedIds]

                // Add any columns from existing order that aren't in the new order
                columnOrder.forEach((id) => {
                  if (!newOrderSet.has(id) && allColumnIds.includes(id)) {
                    finalOrder.push(id)
                  }
                })

                // Add any columns from allColumnIds that aren't in either order
                allColumnIds.forEach((id) => {
                  if (!existingOrderSet.has(id) && !newOrderSet.has(id)) {
                    finalOrder.push(id)
                  }
                })

                setColumnOrder(finalOrder)
              }
            }
          }

          return (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedColumnIds}
                strategy={verticalListSortingStrategy}
              >
                {orderedColumnIds.map((columnId) => {
                  const isDataIn = columnId.startsWith("data_in.")
                  // Try to find column - first in schemaColumns, then in all table columns
                  let column = isDataIn
                    ? table.getAllColumns().find((col) => col.id === columnId)
                    : schemaColumns.find((col) => col.id === columnId)

                  // If not found in schemaColumns, try all table columns
                  if (!column && !isDataIn) {
                    column = table.getAllColumns().find((col) => col.id === columnId)
                  }

                  if (!column && !isDataIn) {
                    console.warn(`[Column Settings] Column ${columnId} not found in schemaColumns or table columns`)
                    return null
                  }

                  if (isDataIn) {
                    // Data_in column
                    const baseKey = columnId.replace("data_in.", "")
                    let fieldTitle: string | null = null
                    if (data && data.length > 0) {
                      for (const row of data) {
                        const dataIn = row.data_in
                        if (dataIn) {
                          try {
                            let parsed: any = dataIn
                            if (typeof dataIn === "string") {
                              try {
                                parsed = JSON.parse(dataIn)
                              } catch (e) {
                                continue
                              }
                            }
                            if (parsed && typeof parsed === "object") {
                              const foundKey = Object.keys(parsed).find((key) => {
                                const langMatch = key.match(/^(.+)_([a-z]{2})$/i)
                                if (langMatch && langMatch[1].toLowerCase() === baseKey.toLowerCase()) {
                                  return true
                                }
                                return key.toLowerCase() === baseKey.toLowerCase()
                              })
                              if (foundKey && parsed[foundKey] !== undefined) {
                                const value = parsed[foundKey]
                                if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                                  const localeValue = value[locale] || value.en || value.ru || value.rs || null
                                  if (localeValue !== null && localeValue !== undefined && typeof localeValue === "object" && "title" in localeValue) {
                                    fieldTitle = localeValue.title || null
                                    if (fieldTitle) break
                                  }
                                }
                              }
                            }
                          } catch (e) {
                            continue
                          }
                        }
                      }
                    }
                    const fieldTranslation =
                      (translations as any)?.dataTable?.fields?.[collection]?.[`data_in.${baseKey}`] ||
                      (translations as any)?.dataTable?.fields?.[collection]?.[baseKey]
                    const columnTitle = fieldTitle || fieldTranslation || baseKey
                    const isVisible = columnVisibility[columnId] !== false
                    const dataInColumn = table.getAllColumns().find((col) => col.id === columnId)
                    const canSort = dataInColumn?.getCanSort() ?? false
                    const defaultSortForColumn = defaultSorting.find((s) => s.id === columnId)
                    const sortValue = defaultSortForColumn ? (defaultSortForColumn.desc ? "desc" : "asc") : "none"

                    return (
                      <SortableColumnItem key={columnId} id={columnId}>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="flex-1">
                            <div className="flex items-center justify-between w-full">
                              <span>{columnTitle}</span>
                              <div className="flex items-center gap-1 ml-2">
                                {isVisible && (
                                  <IconCheck className="h-3 w-3" />
                                )}
                                {defaultSortForColumn && (
                                  defaultSortForColumn.desc ? (
                                    <IconArrowDown className="h-3 w-3 opacity-50" />
                                  ) : (
                                    <IconArrowUp className="h-3 w-3 opacity-50" />
                                  )
                                )}
                              </div>
                            </div>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuCheckboxItem
                              checked={isVisible}
                              onCheckedChange={(value) => {
                                setColumnVisibility((prev) => ({
                                  ...prev,
                                  [columnId]: !!value,
                                }))
                              }}
                            >
                              {t.showColumn}
                            </DropdownMenuCheckboxItem>
                            {canSort && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>{t.defaultSorting}</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                  value={sortValue}
                                  onValueChange={(value) => {
                                    if (value === "none") {
                                      if (sorting.find((s) => s.id === columnId)) {
                                        const newSorting = sorting.filter((s) => s.id !== columnId)
                                        setSorting(newSorting)
                                      }
                                    } else {
                                      const newSort = { id: columnId, desc: value === "desc" }
                                      const newDefaultSorting = defaultSorting.filter((s) => s.id !== columnId)
                                      newDefaultSorting.push(newSort)
                                      const newSorting = sorting.filter((s) => s.id !== columnId)
                                      newSorting.push(newSort)
                                      setSorting(newSorting)
                                    }
                                  }}
                                >
                                  <DropdownMenuRadioItem value="none">
                                    <IconArrowsSort className="h-4 w-4 mr-2" />
                                    {t.none}
                                  </DropdownMenuRadioItem>
                                  <DropdownMenuRadioItem value="asc">
                                    <IconArrowUp className="h-4 w-4 mr-2" />
                                    {t.asc}
                                  </DropdownMenuRadioItem>
                                  <DropdownMenuRadioItem value="desc">
                                    <IconArrowDown className="h-4 w-4 mr-2" />
                                    {t.desc}
                                  </DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>{t.width || "Width"}</DropdownMenuLabel>
                            <div className="px-2 py-1.5">
                              <div className="flex items-center gap-2">
                                <ColumnWidthInput
                                  columnId={columnId}
                                  currentSize={getSafeColumnSize(columnId)}
                                  columnSizing={columnSizing}
                                  setColumnSizing={setColumnSizing}
                                  placeholder={t.widthAuto || "Auto"}
                                />
                                {columnSizing?.[columnId] && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setColumnSizing((prev) => {
                                        const next = { ...prev }
                                        delete next[columnId]
                                        return next
                                      })
                                    }}
                                    title={t.widthReset || "Reset"}
                                  >
                                    <IconX className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>{t.alignment}</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={columnAlignment?.[columnId] || "left"}
                              onValueChange={(value) => {
                                setColumnAlignment((prev) => ({
                                  ...prev,
                                  [columnId]: value as "left" | "center" | "right",
                                }))
                              }}
                            >
                              <DropdownMenuRadioItem value="left">
                                <IconAlignLeft className="h-4 w-4 mr-2" />
                                {t.left}
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="center">
                                <IconAlignCenter className="h-4 w-4 mr-2" />
                                {t.center}
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="right">
                                <IconAlignRight className="h-4 w-4 mr-2" />
                                {t.right}
                              </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </SortableColumnItem>
                    )
                  }

                  // Schema column
                  const columnSchema = schema.find((col) => col.name === columnId)
                  let columnTitle = columnSchema?.title || columnId
                  if (translations && collection) {
                    const dataTableFieldTitle = (translations as any)?.dataTable?.fields?.[collection]?.[columnId] as string | undefined
                    if (dataTableFieldTitle) {
                      columnTitle = dataTableFieldTitle
                    }
                  }
                  const canSort = column?.getCanSort() ?? false
                  const defaultSortForColumn = defaultSorting.find((s) => s.id === columnId)
                  const sortValue = defaultSortForColumn ? (defaultSortForColumn.desc ? "desc" : "asc") : "none"

                  return (
                    <SortableColumnItem key={columnId} id={columnId}>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="flex-1">
                          <div className="flex items-center justify-between w-full">
                            <span>{columnTitle}</span>
                            <div className="flex items-center gap-1 ml-2">
                              {column?.getIsVisible() && (
                                <IconCheck className="h-3 w-3" />
                              )}
                              {defaultSortForColumn && (
                                defaultSortForColumn.desc ? (
                                  <IconArrowDown className="h-3 w-3 opacity-50" />
                                ) : (
                                  <IconArrowUp className="h-3 w-3 opacity-50" />
                                )
                              )}
                            </div>
                          </div>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuCheckboxItem
                            checked={column?.getIsVisible() ?? false}
                            onCheckedChange={(value) =>
                              column?.toggleVisibility(!!value)
                            }
                          >
                            {t.showColumn}
                          </DropdownMenuCheckboxItem>
                          {canSort && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>{t.defaultSorting}</DropdownMenuLabel>
                              <DropdownMenuRadioGroup
                                value={sortValue}
                                onValueChange={(value) => {
                                  if (value === "none") {
                                    if (sorting.find((s) => s.id === columnId)) {
                                      const newSorting = sorting.filter((s) => s.id !== columnId)
                                      setSorting(newSorting)
                                    }
                                  } else {
                                    const newSort = { id: columnId, desc: value === "desc" }
                                    const newDefaultSorting = defaultSorting.filter((s) => s.id !== columnId)
                                    newDefaultSorting.push(newSort)
                                    const newSorting = sorting.filter((s) => s.id !== columnId)
                                    newSorting.push(newSort)
                                    setSorting(newSorting)
                                  }
                                }}
                              >
                                <DropdownMenuRadioItem value="none">
                                  <IconArrowsSort className="h-4 w-4 mr-2" />
                                  {t.none}
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="asc">
                                  <IconArrowUp className="h-4 w-4 mr-2" />
                                  {t.asc}
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="desc">
                                  <IconArrowDown className="h-4 w-4 mr-2" />
                                  {t.desc}
                                </DropdownMenuRadioItem>
                              </DropdownMenuRadioGroup>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>{t.width || "Width"}</DropdownMenuLabel>
                          <div className="px-2 py-1.5">
                            <div className="flex items-center gap-2">
                              <ColumnWidthInput
                                columnId={columnId}
                                currentSize={getSafeColumnSize(columnId)}
                                columnSizing={columnSizing}
                                setColumnSizing={setColumnSizing}
                                placeholder={t.widthAuto || "Auto"}
                              />
                              {columnSizing?.[columnId] && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    setColumnSizing((prev) => {
                                      const next = { ...prev }
                                      delete next[columnId]
                                      return next
                                    })
                                  }}
                                  title={t.widthReset || "Reset"}
                                >
                                  <IconX className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>{t.alignment}</DropdownMenuLabel>
                          <DropdownMenuRadioGroup
                            value={columnAlignment?.[columnId] || "left"}
                            onValueChange={(value) => {
                              setColumnAlignment((prev) => ({
                                ...prev,
                                [columnId]: value as "left" | "center" | "right",
                              }))
                            }}
                          >
                            <DropdownMenuRadioItem value="left">
                              <IconAlignLeft className="h-4 w-4 mr-2" />
                              {t.left}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="center">
                              <IconAlignCenter className="h-4 w-4 mr-2" />
                              {t.center}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="right">
                              <IconAlignRight className="h-4 w-4 mr-2" />
                              {t.right}
                            </DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </SortableColumnItem>
                  )
                })}
              </SortableContext>
            </DndContext>
          )
        })()}
        {/* Page size setting */}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <div className="flex items-center justify-between w-full">
              <span>{t.rowsPerPage}</span>
              <span className="text-muted-foreground text-sm ml-2">{defaultPageSize}</span>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent sideOffset={4}>
            <DropdownMenuLabel>{t.rowsPerPage}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={String(defaultPageSize)}
              onValueChange={(value) => {
                const pageSize = Number(value)
                if (!isNaN(pageSize) && pageSize > 0) {
                  setDefaultPageSize(pageSize)
                  setPagination((prev: PaginationState) => ({ ...prev, pageSize }))
                  setState((prev: any) => {
                    return ({ ...prev, pageSize })
                  })
                }
              }}
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <DropdownMenuRadioItem
                  key={pageSize}
                  value={String(pageSize)}
                >
                  {pageSize}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Edit mode */}
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-4 px-2 py-1.5">
          <div className="flex items-center">
            <IconEdit className="h-4 w-4 mr-2" />
            <Label htmlFor="edit-mode-switch" className="text-sm font-medium cursor-pointer">
              {t.editMode || "Edit Mode"}
            </Label>
          </div>
          <Switch
            id="edit-mode-switch"
            checked={editMode}
            onCheckedChange={(checked) => {
              setEditMode(checked)
              if (typeof window !== "undefined" && collection) {
                try {
                  localStorage.setItem(`edit-mode-${collection}`, JSON.stringify(checked))
                } catch (e) {
                  // Ignore
                }
              }
            }}
          />
        </div>
        {/* Card view mode */}
        <DropdownMenuSeparator />
        {isMobile && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <IconLayoutGrid className="h-4 w-4 mr-2" />
                  <span>{t.cardView || "Card View"}</span>
                </div>
                {cardViewModeMobile && (
                  <IconCheck className="h-4 w-4" />
                )}
              </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <div className="flex items-center justify-between gap-4 px-2 py-1.5">
                <Label htmlFor="card-view-mobile-switch" className="text-sm font-medium text-start cursor-pointer">
                  {t.cardView || "Card View"}
                </Label>
                <Switch
                  id="card-view-mobile-switch"
                  checked={cardViewModeMobile}
                  onCheckedChange={setCardViewModeMobile}
                />
              </div>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {!isMobile && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <IconLayoutGrid className="h-4 w-4 mr-2" />
                  <span>{t.cardView || "Card View"}</span>
                </div>
                {cardViewModeDesktop && (
                  <IconCheck className="h-4 w-4" />
                )}
              </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <div className="flex items-center justify-between gap-4 px-2 py-1.5">
                <Label htmlFor="card-view-desktop-switch" className="text-sm font-medium text-start cursor-pointer">
                  {t.cardView || "Card View"}
                </Label>
                <Switch
                  id="card-view-desktop-switch"
                  checked={cardViewModeDesktop}
                  onCheckedChange={setCardViewModeDesktop}
                />
              </div>
              {cardViewModeDesktop && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{t.cardsPerRow || "Cards per row"}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={String(cardsPerRow)}
                    onValueChange={(value) => {
                      const numValue = parseInt(value, 10)
                      if (numValue >= 1 && numValue <= 6) {
                        setCardsPerRow(numValue)
                      }
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <DropdownMenuRadioItem key={num} value={String(num)}>
                        {num}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
