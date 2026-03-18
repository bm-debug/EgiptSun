
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

import { ImageIcon } from "lucide-react"
import {
  Row,
  VisibilityState,
  ColumnDef,
  HeaderContext,

} from "@tanstack/react-table"
import {
  ColumnSchemaExtended,
  CollectionData,
  SelectOption,

} from "../types"

import {
  IconDotsVertical,
  IconCheck,
  IconX,
  IconArrowUp,
  IconArrowDown,
  IconArrowsSort,
  IconCopy,
} from "@tabler/icons-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/packages/components/ui/button"
import { Badge } from "@/packages/components/ui/badge"
import { getCollection } from "@/shared/collections/getCollection"
import BaseColumn from "@/shared/columns/BaseColumn"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RelationSelect } from "../RelationSelect"
import { Input } from "@/packages/components/ui/input"
import { Textarea } from "@/packages/components/ui/textarea"
import { copyToClipboard } from "./copyToClipboard"
import { formatDateTimeForLocale } from "./formatDateTimeForLocale"
import { RTL_LOCALES } from "@/settings"
import Link from "next/link"

// Dynamic column generator
export function generateColumns(
  schema: ColumnSchemaExtended[],
  onDeleteRequest: (row: Row<CollectionData>) => void,
  onEditRequest: (row: Row<CollectionData>) => void,
  onDuplicateRequest?: (row: Row<CollectionData>) => void,
  locale: string = 'en',
  relationData: Record<string, Record<any, string>> = {}, 
  translations?: any,
  collection?: string,
  data?: CollectionData[],
  columnVisibility?: VisibilityState,
  columnAlignment?: Record<string, 'left' | 'center' | 'right'>, columnSizing?: Record<string, number>,
  editMode: boolean = false,
  handleCellUpdate?: (rowId: string | number, fieldName: string, value: any) => void,
  fullSchema?: ColumnSchemaExtended[],
  getEditedCellValue?: (rowIdStr: string, fieldName: string) => any,
  segmentStatuses?: SelectOption[]): ColumnDef<CollectionData>[] {
  const isImagesColumnVisible =
    columnVisibility?.["data_in.images"] !== false &&
    columnVisibility?.["images"] !== false

  const getFirstTextImageUrl = (row: CollectionData): string | null => {
    if (collection !== 'texts') return null
    const dataInRaw = row?.data_in
    if (!dataInRaw) return null

    try {
      const dataIn = typeof dataInRaw === 'string' ? JSON.parse(dataInRaw) : dataInRaw
      const images = dataIn?.images
      if (Array.isArray(images) && images.length > 0 && typeof images[0] === 'string') {
        return images[0]
      }
      if (typeof images === 'string' && images) {
        return images
      }
    } catch {
      // Ignore invalid JSON in data_in
    }

    return null
  }

  return [
    {
      id: "select",
      enableResizing: false,
      size: 40,
      minSize: 40,
      maxSize: 40,
      header: ({ table }) => (
        <div className="flex items-center justify-center pl-2 pr-1 py-0">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label={translations?.selectAll ?? "Select all"}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center pl-2 pr-1 py-0">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={translations?.selectRow ?? "Select row"}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },

    ...schema.filter(col => !col.hidden && !col.hiddenTable).map((col) => {
      // Set smaller default size for ID and media_id columns in contractors collection
      const isContractorsId = collection === 'contractors' && col.name === 'id'
      const isContractorsLogo = collection === 'contractors' && col.name === 'media_id'
      const isAidColumn = col.name.toLowerCase().endsWith('aid')
      // For ID, allow smaller sizes (user can set 50px)
      const defaultSize = isContractorsId ? 80 : (isContractorsLogo ? 80 : (isAidColumn ? 72 : undefined))
      const defaultMinSize = isContractorsId ? 50 : (isContractorsLogo ? 80 : (isAidColumn ? 48 : 100))
      const defaultMaxSize = isContractorsId ? undefined : (isContractorsLogo ? 120 : undefined)
      
      // Check if this column has a relation (for multiselect filtering)
      const hasRelation = col.relation
      
      // Determine if this is a multiselect field
      const isMultiselect = !hasRelation && (
        (col.fieldType === 'select' && col.selectOptions) ||
        (col.fieldType === 'enum' && col.enum) ||
        col.fieldType === 'array' ||
        (col as any).multiple === true
      )
      
      // Custom filter function for multiselect and relation fields (OR logic)
      const customFilterFn = (isMultiselect || hasRelation) ? (row: any, columnId: string, filterValue: any) => {
        if (!filterValue) {
          return true
        }
        
        // Handle array values (multiselect) - OR logic
        if (Array.isArray(filterValue)) {
          if (filterValue.length === 0) {
            return true
          }
          const cellValue = row.getValue(columnId) as string | null | undefined
          // OR logic: cell value should be in the filter array
          return cellValue ? filterValue.includes(cellValue) : false
        }
        
        // Handle single value (relation or text filter)
        const cellValue = row.getValue(columnId) as string | null | undefined
        return cellValue ? String(cellValue) === String(filterValue) : false
      } : undefined
      
      return {    id: col.name, // Explicitly set id to match accessorKey
      accessorKey: col.name,
      enableSorting: true,
      enableResizing: true,
      size: columnSizing?.[col.name] || defaultSize,
      minSize: defaultMinSize,
      maxSize: defaultMaxSize,
      ...(customFilterFn && { filterFn: customFilterFn }),
      header: ({ column, table }: HeaderContext<CollectionData, unknown>) => {
        const sortedIndex = table.getState().sorting.findIndex((s: any) => s.id === column.id)
        const isSorted = column.getIsSorted()
        // Get alignment for this column
        const alignment = columnAlignment?.[col.name] || 'left'
        const isCentered = alignment === 'center'
        const isRight = alignment === 'right'
        const hasMultipleSorts = table.getState().sorting.length > 1
        const headerAlignClass = isCentered ? 'justify-center' : isRight ? 'justify-end' : 'justify-start'

        return (
          <Button
            variant="ghost"
            className={`h-auto p-0 hover:bg-transparent font-semibold ${headerAlignClass}`}
            onClick={(e) => {
              if (e.shiftKey) {
                // Shift + click: add to multi-sort
                column.toggleSorting(isSorted === "asc", true)
              } else {
                // Regular click: toggle sort (replaces existing sorts)
                column.toggleSorting(isSorted === "asc")
              }
            }}
            title={column.getCanSort() ? (hasMultipleSorts ? (translations as any)?.dataTable?.sortTooltipMultiple || "Click: change sort | Shift+Click: add to sort" : (translations as any)?.dataTable?.sortTooltipSingle || "Click: sort | Shift+Click: add to sort") : undefined}
          >
            <div className={`flex items-center gap-1 ${headerAlignClass}`}>
              <span>{(translations as any)?.fields?.[collection || '']?.[col.name] || col.title || col.name}</span>
              {col.primary && (
                <Badge variant="outline" className="text-[10px] px-0 py-0">
                  PK
                </Badge>
              )}
              {column.getCanSort() && (
                <span className="ml-1 inline-flex items-center gap-0.5 align-middle leading-none">
                  {isSorted ? (
                    <>
                      {isSorted === "asc" ? (
                        <IconArrowUp className="h-3 w-3 shrink-0" />
                      ) : (
                        <IconArrowDown className="h-3 w-3 shrink-0" />
                      )}
                      {sortedIndex >= 0 && hasMultipleSorts && (
                        <Badge variant="secondary" className="h-4 min-w-4 shrink-0 items-center justify-center px-0 py-0 text-[9px] font-semibold leading-none align-middle">
                          {sortedIndex + 1}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <IconArrowsSort className="h-3 w-3 shrink-0 opacity-30" />
                  )}
                </span>
              )}
            </div>
          </Button>
        )
      },
      cell: ({ row }: { row: Row<CollectionData> }) => {
        // Get row ID for updates
        const primaryKey = (fullSchema || schema).find((f: ColumnSchemaExtended) => f.primary)?.name || 'id'
        const rowId = row.original[primaryKey]
        const rowIdStr = String(rowId)
        const isAidField = col.name.toLowerCase().endsWith('aid')
        const collectionConfig = getCollection(collection as string)

        // Get value - check editedCells first, then original value
        const editedValue = getEditedCellValue?.(rowIdStr, col.name)
        let value: any = editedValue !== undefined ? editedValue : row.original[col.name]

        // Get alignment for this column
        const alignment = columnAlignment?.[col.name] || (col.name === 'is_system' || col.name === 'order' ? 'center' : 'left')
        const alignmentClass = alignment === 'center' ? 'text-center' : alignment === 'right' ? 'text-end' : 'text-start'
        const collectionField = (collectionConfig as unknown as Record<string, unknown>)[col.name]
        // Check if collectionField is an instance of BaseColumn before calling getOption
        if (collectionField && collectionField instanceof BaseColumn && collectionField.getOption('i18n')) {
          if (typeof value === 'object') {
            value = value[locale] || ''
          }
        }

        // Edit mode: return editable components
        if (editMode && handleCellUpdate && !col.primary && !col.hidden && col.name !== 'id' && col.name !== 'uuid' && col.name !== 'created_at' && col.name !== 'updated_at') {
          // Boolean fields - Checkbox
          if (col.fieldType === 'boolean') {
            const boolValue = value === 1 || value === true || value === '1' || value === 'true'
            return (
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={boolValue}
                  disabled={isAidField}
                  onCheckedChange={(checked) => {
                    void handleCellUpdate(rowId, col.name, checked)
                  }}
                />
              </div>
            )
          }

          // Select fields
          if (col.fieldType === 'select' && col.selectOptions) {
            return (
              <Select
                value={value ? String(value) : ""}
                disabled={isAidField}
                onValueChange={(val) => {
                  void handleCellUpdate(rowId, col.name, val)
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {col.selectOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }

          // Enum fields
          if (col.fieldType === 'enum' && col.enum) {
            return (
              <Select
                value={value ? String(value) : ""}
                disabled={isAidField}
                onValueChange={(val) => {
                  void handleCellUpdate(rowId, col.name, val)
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {col.enum.values.map((val, idx) => (
                    <SelectItem key={val} value={String(val)}>
                      {col.enum!.labels[idx]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }

          // Relation fields
          if (col.relation) {
            return (
              <RelationSelect
                relation={col.relation}
                value={value}
                disabled={isAidField}
                onChange={(val) => {
                  void handleCellUpdate(rowId, col.name, val)
                }}
                translations={translations}
                locale={locale}
              />
            )
          }

          // Price fields
          if (col.fieldType === 'price') {
            const cents = value === null || value === undefined || value === '' ? NaN : Number(value)
            const amount = isFinite(cents) ? (cents / 100).toFixed(2) : ''
            return (
              <Input
                type="number"
                step="0.01"
                value={amount}
                disabled={isAidField}
                onChange={(e) => {
                  const numValue = parseFloat(e.target.value)
                  if (!isNaN(numValue)) {
                    void handleCellUpdate(rowId, col.name, Math.round(numValue * 100))
                  }
                }}
                className="h-8 text-xs"
              />
            )
          }

          // Number fields
          if (col.fieldType === 'number') {
            return (
              <Input
                type="number"
                value={value ?? ''}
                disabled={isAidField}
                onChange={(e) => {
                  const numValue = parseFloat(e.target.value)
                  if (!isNaN(numValue)) {
                    void handleCellUpdate(rowId, col.name, numValue)
                  } else if (e.target.value === '') {
                    void handleCellUpdate(rowId, col.name, null)
                  }
                }}
                className="h-8 text-xs"
              />
            )
          }

          // Textarea fields
          if (col.textarea) {
            return (
              <Textarea
                value={value ?? ''}
                disabled={isAidField}
                onChange={(e) => {
                  void handleCellUpdate(rowId, col.name, e.target.value)
                }}
                className="h-8 text-xs min-h-[32px]"
                rows={1}
              />
            )
          }

          // Default: text input
          return (
            <Input
              type="text"
              value={value ?? ''}
              disabled={isAidField}
              onChange={(e) => {
                void handleCellUpdate(rowId, col.name, e.target.value)
              }}
              className="h-8 text-xs"
            />
          )
        }

        // Non-edit mode: return display components
        if (col.name === 'id') {
          return <div className={`font-mono tabular-nums ${alignmentClass}`}>{value ?? "-"}</div>
        }

        if (col.name === 'uuid' || col.name === 'raid') {
          const raw = value ? String(value) : ""
          if (!raw) return <div>-</div>
          return (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs" title={raw}>
                {truncateMiddle(raw)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  void copyToClipboard(raw)
                }}
              >
                <IconCopy className="h-4 w-4" />
                <span className="sr-only">{translations?.copy || "Copy"}</span>
              </Button>
            </div>
          )
        }

        if (col.name === 'created_at' || col.name === 'updated_at') {
          return <div className={`whitespace-nowrap ${alignmentClass}`}>
            {formatDateTimeForLocale(value, locale)}
            </div>
        }

        // For boolean type, show checkbox-like display
        if (col.fieldType === 'boolean') {
          const boolValue = value === 1 || value === true || value === '1' || value === 'true'
          const alignClass = alignment === 'center' ? 'justify-center' : alignment === 'right' ? 'justify-end' : 'justify-start'
          return (
            <div className={`flex items-center ${alignClass}`}>
              {boolValue ? (
                <IconCheck className="size-4 text-green-600" />
              ) : (
                <IconX className="size-4 text-red-600" />
              )}
            </div>
          )
        }
        // For price type (stored as integer cents), show as decimal with 2 digits
        if (col.fieldType === 'price') {
          const cents =
            value === null || value === undefined || value === ''
              ? NaN
              : Number(value)
          const amount = isFinite(cents) ? (cents / 100).toFixed(2) : '-'
          return <div className={`${col.primary ? "font-mono font-medium" : "font-mono"} ${alignmentClass}`}>{amount}</div>
        }
        // For media_id in contractors, show logo image or placeholder
        if (col.name === 'media_id' && collection === 'contractors') {
          const mediaId = value
          if (mediaId) {
            // media_id is UUID, use admin files endpoint
            const imageUrl = `/api/altrp/v1/admin/files/${mediaId}`
            return (
              <div className="flex items-center justify-start">
                <img
                  src={imageUrl}
                  alt="Logo"
                  className="h-10 w-10 rounded object-cover"
                  onError={(e) => {
                    // Fallback to placeholder on error
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const placeholder = target.nextElementSibling as HTMLElement
                    if (placeholder) placeholder.style.display = 'flex'
                  }}
                />
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center" style={{ display: 'none' }}>
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            )
          }
          return (
            <div className="flex items-center justify-start">
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          )
        }
        // For enum type, show label instead of value
        if (col.fieldType === 'enum' && col.enum) {
          const valueIndex = col.enum.values.indexOf(String(value))
          const label = valueIndex >= 0 ? col.enum.labels[valueIndex] : value || "-"
          return <div className={alignmentClass}>{label}</div>
        }

        // For relation fields, show label instead of value
        if (col.relation && relationData[col.name]) {
          const label = relationData[col.name][value] || value || "-"
          return <div className={alignmentClass}>{label}</div>
        }

        // For select fields, show label instead of value
        if (col.fieldType === 'select' && col.selectOptions) {
          // Normalize comparison: compare both as strings, case-insensitive
          const normalizedValue = String(value || '').toLowerCase().trim()
          const option = col.selectOptions.find(opt => {
            const optValue = String(opt.value || '').toLowerCase().trim()
            return optValue === normalizedValue
          })
          const displayValue = option ? option.label : value || "-"
          return <div className={alignmentClass}>{displayValue}</div>
        }

        // For JSON fields in taxonomy collection (title and category fields), extract translation by locale
        // Also handle title field in roles, expanses, and contractors collections
        if (col.fieldType === 'json' && ((collection === 'taxonomy' && (col.name === 'title' || col.name === 'category')) || (collection === 'roles' && col.name === 'title') || (collection === 'expanses' && col.name === 'title') || (collection === 'contractors' && col.name === 'title'))) {          
          let jsonValue = value

          // If category is empty, try to extract it from data_in
          if (col.name === 'category' && (!jsonValue || jsonValue === '' || jsonValue === null)) {
            const rowData = row.original
            const dataIn = rowData?.data_in
            if (dataIn && typeof dataIn === 'string') {
              try {
                const dataInJson = JSON.parse(dataIn)
                if (dataInJson && typeof dataInJson === 'object' && dataInJson.category) {
                  jsonValue = dataInJson.category
                }
              } catch (e) {
                // data_in is not valid JSON, ignore
              }
            }
          }

          if (typeof jsonValue === 'string') {
            try {
              jsonValue = JSON.parse(jsonValue)
            } catch (e) {
              // If it's not valid JSON, treat as plain text (backward compatibility)
            }
          }
          if (jsonValue && typeof jsonValue === 'object') {
            const localeValue = jsonValue[locale] || jsonValue.en || jsonValue.ru || jsonValue.rs || null
            // If localeValue is an object with title and value structure, use the value for table/card body
            if (localeValue && typeof localeValue === 'object' && 'value' in localeValue) {
              const displayValue = localeValue.value != null ? String(localeValue.value) : "-"
              return <div className={alignmentClass}>{displayValue}</div>
            } else if (localeValue !== null && localeValue !== undefined) {
              // If it's a simple value (string, number, etc.)
              return <div className={alignmentClass}>{String(localeValue)}</div>
            }
            return <div className={alignmentClass}>-</div>
          }
        }
  // For taxonomy.entity field, translate using entityOptions
  if (collection === 'taxonomy' && col.name === 'entity' && value) {
    const entityOptions = (translations as any)?.taxonomy?.entityOptions || {}
    const translatedValue = entityOptions[value] || value
    return (
      <div className={`${col.primary ? "font-mono font-medium" : ""}`}>
        {translatedValue}
      </div>
    )
  }
        // Use defaultCell if value is empty/null/undefined
        const isEmpty = value === null || value === undefined || value === ''
        const displayValue = isEmpty && col.defaultCell !== undefined
          ? col.defaultCell
          : col.format
            ? col.format(value, locale)
            : formatCellValue(value)

        // For textarea fields, truncate text in table
        if (col.textarea) {
          const textValue = typeof displayValue === 'string' ? displayValue : String(displayValue || '')
          return (
            <div className={`${col.primary ? "font-mono font-medium" : ""} truncate max-w-[300px] ${alignmentClass}`} title={textValue}>
              {textValue || "-"}
            </div>
          )
        }

        if (collection === 'texts' && col.name === 'title' && isImagesColumnVisible) {
          const imageUrl = getFirstTextImageUrl(row.original)
          const titleText = typeof displayValue === 'string' ? displayValue : String(displayValue || "-")
          return (
            <div className="flex items-center gap-2 min-w-0">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Article image"
                  className="h-8 w-8 rounded object-cover shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <span className="truncate min-w-0">{titleText}</span>
            </div>
          )
        }

        return (
          <div className={`${col.primary ? "font-mono font-medium" : ""}`}>
            {displayValue}
          </div>
        )
      },
    }
  }),
    // Dynamic columns from data_in
    ...(data && columnVisibility ? (() => {
      // Get all unique base keys from data_in in all records
      const allDataInKeys = new Set<string>()
      data.forEach((row) => {
        const dataIn = row.data_in
        if (dataIn) {
          try {
            let parsed: any = dataIn
            if (typeof dataIn === 'string') {
              try {
                parsed = JSON.parse(dataIn)
              } catch (e) {
                return
              }
            }
            if (parsed && typeof parsed === 'object') {
              Object.keys(parsed).forEach((key) => {
                // Remove language suffix if present
                const langMatch = key.match(/^(.+)_([a-z]{2})$/i)
                if (langMatch && ['en', 'ru', 'rs'].includes(langMatch[2].toLowerCase())) {
                  allDataInKeys.add(langMatch[1])
                } else {
                  allDataInKeys.add(key)
                }
              })
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      })

      // Create columns only for visible data_in fields
      // Exclude fields that are already defined in schema as virtual fields
      const schemaDataInFields = new Set(
        schema
          .filter(col => col.virtual && col.name.startsWith('data_in.'))
          .map(col => col.name.replace('data_in.', ''))
      )
      
      return Array.from(allDataInKeys)
        .filter((baseKey) => {
          const columnId = `data_in.${baseKey}`
          // Skip if already defined in schema as virtual field
          if (schemaDataInFields.has(baseKey)) {
            return false
          }
          return columnVisibility[columnId] !== false
        })
        .map((baseKey) => {
          // Try to get title from data_in in first record that has this field
          let fieldTitle: string | null = null
          if (data && data.length > 0) {
            for (const row of data) {
              const dataIn = row.data_in
              if (dataIn) {
                try {
                  let parsed: any = dataIn
                  if (typeof dataIn === 'string') {
                    try {
                      parsed = JSON.parse(dataIn)
                    } catch (e) {
                      continue
                    }
                  }
                  if (parsed && typeof parsed === 'object') {
                    // Find the key (case-insensitive)
                    const foundKey = Object.keys(parsed).find(key => {
                      const langMatch = key.match(/^(.+)_([a-z]{2})$/i)
                      if (langMatch && langMatch[1].toLowerCase() === baseKey.toLowerCase()) {
                        return true
                      }
                      return key.toLowerCase() === baseKey.toLowerCase()
                    })
                    if (foundKey && parsed[foundKey] !== undefined) {
                      const value = parsed[foundKey]
                      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        const localeValue = value[locale] || value.en || value.ru || value.rs || null
                        if (localeValue !== null && localeValue !== undefined && typeof localeValue === 'object' && 'title' in localeValue) {
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
          // Fallback to translation or baseKey
          // Use correct path to translations: translations.dataTable.fields
          // translations parameter is already the dataTable object, so use translations.fields directly
          const fieldTranslation =
            (translations as any)?.fields?.[collection || '']?.[`data_in.${baseKey}`] ||
            (translations as any)?.fields?.[collection || '']?.[baseKey]
          const columnTitle = fieldTitle || fieldTranslation || baseKey

          return {
            id: `data_in.${baseKey}`,
            accessorFn: (row: CollectionData) => {
              const dataIn = row.data_in
              if (dataIn) {
                try {
                  let parsed: any = dataIn
                  if (typeof dataIn === 'string') {
                    try {
                      parsed = JSON.parse(dataIn)
                    } catch (e) {
                      return null
                    }
                  }
                  if (parsed && typeof parsed === 'object') {
                    // Find the key (case-insensitive)
                    const foundKey = Object.keys(parsed).find(key => {
                      const langMatch = key.match(/^(.+)_([a-z]{2})$/i)
                      if (langMatch && langMatch[1].toLowerCase() === baseKey.toLowerCase()) {
                        return true
                      }
                      return key.toLowerCase() === baseKey.toLowerCase()
                    })
                    if (foundKey && parsed[foundKey] !== undefined) {
                      const value = parsed[foundKey]
                      // If value is an object with language keys
                      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        const localeValue = value[locale] || value.en || value.ru || value.rs || null
                        if (localeValue !== null && localeValue !== undefined) {
                          // Check if localeValue is an object with title and value structure
                          if (typeof localeValue === 'object' && 'value' in localeValue) {
                            return localeValue.value != null ? String(localeValue.value) : null
                          } else {
                            return String(localeValue)
                          }
                        }
                      } else if (value !== null && value !== undefined) {
                        return String(value)
                      }
                    }
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
              return null
            },
            enableSorting: true,
            header: ({ column, table }: HeaderContext<CollectionData, unknown>) => {
              const sortedIndex = table.getState().sorting.findIndex((s: any) => s.id === column.id)
              const isSorted = column.getIsSorted()
              const hasMultipleSorts = table.getState().sorting.length > 1

              // Get alignment for this data_in column
              const columnId = `data_in.${baseKey}`
              const alignment = columnAlignment?.[columnId] || 'left'
              const isCentered = alignment === 'center'
              const isRight = alignment === 'right'
              const headerAlignClass = isCentered ? 'justify-center' : isRight ? 'justify-end' : 'justify-start'

              return (
                <Button
                  variant="ghost"
                  className={`h-auto p-0 hover:bg-transparent font-semibold ${headerAlignClass}`}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      // Shift + click: add to multi-sort
                      column.toggleSorting(isSorted === "asc", true)
                    } else {
                      // Regular click: toggle sort (replaces existing sorts)
                      column.toggleSorting(isSorted === "asc")
                    }
                  }}
                  title={hasMultipleSorts ? (translations as any)?.dataTable?.sortTooltipMultiple || "Click: change sort | Shift+Click: add to sort" : (translations as any)?.dataTable?.sortTooltipSingle || "Click: sort | Shift+Click: add to sort"}
                >
                  <div className={`flex items-center gap-1 ${headerAlignClass}`}>
                    <span>{columnTitle}</span>
                    <span className="ml-1 inline-flex items-center gap-0.5 align-middle leading-none">
                      {isSorted ? (
                        <>
                          {isSorted === "asc" ? (
                            <IconArrowUp className="h-3 w-3 shrink-0" />
                          ) : (
                            <IconArrowDown className="h-3 w-3 shrink-0" />
                          )}
                          {sortedIndex >= 0 && hasMultipleSorts && (
                            <Badge variant="secondary" className="h-4 min-w-4 shrink-0 items-center justify-center px-0 py-0 text-[9px] font-semibold leading-none align-middle">
                              {sortedIndex + 1}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <IconArrowsSort className="h-3 w-3 shrink-0 opacity-30" />
                      )}
                    </span>
                  </div>
                </Button>
              )
            },
            cell: ({ getValue, row }: { getValue: () => any; row: Row<CollectionData> }) => {
              // Get row ID for updates
              const primaryKey = fullSchema?.find((f: ColumnSchemaExtended) => f.primary)?.name || 'id'
              const rowId = row.original[primaryKey]
              const rowIdStr = String(rowId)

              // Check editedCells first for data_in
              const editedDataIn = getEditedCellValue?.(rowIdStr, 'data_in')
              let value = getValue()

              // If data_in was edited, extract value from edited data_in
              if (editedDataIn !== undefined) {
                try {
                  let parsed: any = editedDataIn
                  if (typeof editedDataIn === 'string') {
                    parsed = JSON.parse(editedDataIn)
                  }

                  if (parsed && typeof parsed === 'object') {
                    const foundKey = Object.keys(parsed).find(key => {
                      const langMatch = key.match(/^(.+)_([a-z]{2})$/i)
                      if (langMatch && langMatch[1].toLowerCase() === baseKey.toLowerCase()) {
                        return true
                      }
                      return key.toLowerCase() === baseKey.toLowerCase()
                    })

                    if (foundKey && parsed[foundKey] !== undefined) {
                      const fieldValue = parsed[foundKey]

                      if (typeof fieldValue === 'object' && fieldValue !== null && !Array.isArray(fieldValue)) {
                        const localeValue = fieldValue[locale] || fieldValue.en || fieldValue.ru || fieldValue.rs || null
                        if (localeValue !== null && localeValue !== undefined) {
                          if (typeof localeValue === 'object' && 'value' in localeValue) {
                            value = localeValue.value != null ? String(localeValue.value) : null
                          } else {
                            value = String(localeValue)
                          }
                        } else {
                          value = null
                        }
                      } else {
                        value = String(fieldValue)
                      }
                    }
                  }
                } catch (e) {
                  // Ignore parse errors, use original value
                }
              }

              // If value is still an object or JSON string, try to parse it
              // This can happen if data_in was already parsed as object but value wasn't extracted
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                // Value is an object, try to extract locale value
                const localeValue = value[locale] || value.en || value.ru || value.rs || null
                if (localeValue !== null && localeValue !== undefined) {
                  if (typeof localeValue === 'object' && 'value' in localeValue) {
                    value = localeValue.value != null ? String(localeValue.value) : null
                  } else {
                    value = String(localeValue)
                  }
                } else {
                  value = null
                }
              } else if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                // Value is a JSON string, try to parse it
                try {
                  const parsed = JSON.parse(value)
                  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    const localeValue = parsed[locale] || parsed.en || parsed.ru || parsed.rs || null
                    if (localeValue !== null && localeValue !== undefined) {
                      if (typeof localeValue === 'object' && 'value' in localeValue) {
                        value = localeValue.value != null ? String(localeValue.value) : null
                      } else {
                        value = String(localeValue)
                      }
                    } else {
                      value = null
                    }
                  }
                } catch (e) {
                  // Not valid JSON, use as is
                }
              }

              // Get alignment for this data_in column
              const columnId = `data_in.${baseKey}`
              const alignment = columnAlignment?.[columnId] || 'left'
              const alignmentClass = alignment === 'center' ? 'text-center' : alignment === 'right' ? 'text-end' : 'text-start'

              // Edit mode: return editable input for data_in fields
              if (editMode && handleCellUpdate && fullSchema) {
                const primaryKey = fullSchema.find((f: ColumnSchemaExtended) => f.primary)?.name || 'id'
                const rowId = row.original[primaryKey]
                const rowIdStr = String(rowId)

                // Get current data_in from editedCells or original
                const editedDataIn = getEditedCellValue?.(rowIdStr, 'data_in')
                const currentDataIn = editedDataIn !== undefined ? editedDataIn : row.original.data_in
                return (
                  <Input
                    type="text"
                    value={value ?? ''}
                    onChange={(e) => {
                      // Update data_in field - need to update entire data_in structure
                      let parsed: any = {}

                      if (currentDataIn) {
                        try {
                          parsed = typeof currentDataIn === 'string' ? JSON.parse(currentDataIn) : currentDataIn
                        } catch (e) {
                          // Ignore
                        }
                      }

                      // Update the value in the structure
                      // Try to find existing key (with or without language suffix)
                      const foundKey = Object.keys(parsed).find(key => {
                        const langMatch = key.match(/^(.+)_([a-z]{2})$/i)
                        if (langMatch && langMatch[1].toLowerCase() === baseKey.toLowerCase()) {
                          return true
                        }
                        return key.toLowerCase() === baseKey.toLowerCase()
                      })

                      if (foundKey) {
                        // Update existing key
                        const existingValue = parsed[foundKey]
                        if (typeof existingValue === 'object' && existingValue !== null && !Array.isArray(existingValue)) {
                          // Update value in locale structure
                          const langMatch = foundKey.match(/^(.+)_([a-z]{2})$/i)
                          if (langMatch) {
                            // Key has language suffix, update that locale
                            const lang = langMatch[2].toLowerCase()
                            if (!existingValue[lang]) {
                              existingValue[lang] = {}
                            }
                            if (typeof existingValue[lang] === 'object' && 'value' in existingValue[lang]) {
                              existingValue[lang].value = e.target.value
                            } else {
                              existingValue[lang] = { value: e.target.value }
                            }
                          } else {
                            // No language suffix, update all locales
                            for (const lang of ['en', 'ru', 'rs']) {
                              if (!existingValue[lang]) {
                                existingValue[lang] = {}
                              }
                              if (typeof existingValue[lang] === 'object' && 'value' in existingValue[lang]) {
                                existingValue[lang].value = e.target.value
                              } else {
                                existingValue[lang] = { value: e.target.value }
                              }
                            }
                          }
                        } else {
                          // Simple value, update directly
                          parsed[foundKey] = e.target.value
                        }
                      } else {
                        // Create new key with locale structure
                        const langObject: Record<string, { value: string }> = {}
                        for (const lang of ['en', 'ru', 'rs']) {
                          langObject[lang] = { value: e.target.value }
                        }
                        parsed[baseKey] = langObject
                      }

                      // Update entire data_in in local state
                      handleCellUpdate(rowId, 'data_in', parsed)
                    }}
                    className="h-8 text-xs"
                  />
                )
              }

              return <div className={alignmentClass}>{value || '-'}</div>
            },
          }
        })
    })() : []),
    {
      id: "actions",
      enableResizing: false,
      size: 40,
      minSize: 40,
      maxSize: 40,
      cell: ({ row }) => (
        <div className="flex items-center justify-center p-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                size="icon"
              >
                <IconDotsVertical />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side={RTL_LOCALES.includes(locale) ? "left" : "right"} className="w-36">
              <DropdownMenuItem onClick={() => onEditRequest(row)}>{translations?.actions?.edit || "Edit"}</DropdownMenuItem>
              {collection === 'roles' && row.original.name !== 'Administrator' && (
                <DropdownMenuItem asChild>
                  <Link href={`/admin/role-schema?role=${encodeURIComponent(row.original.name ?? row.original.uuid ?? '')}`}>
                    {translations?.actions?.manageRoleSchema || "Manage role schema"}
                  </Link>
                </DropdownMenuItem>
              )}
              {onDuplicateRequest && (
                <DropdownMenuItem onClick={() => onDuplicateRequest(row)}>
                  {translations?.actions?.duplicate || "Duplicate"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDeleteRequest(row)}>
                {translations?.delete?.delete || "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]
}


export function truncateMiddle(value: string, head: number = 8, tail: number = 6): string {
  const v = String(value || "")
  if (v.length <= head + tail + 1) return v
  return `${v.slice(0, head)}…${v.slice(-tail)}`
}

// Helper to format cell value
export function formatCellValue(value: any): React.ReactNode {
  if (value === null || value === undefined) return "-"
  if (typeof value === "boolean") {
    return (
      <div className="flex items-center justify-center">
        {value ? <IconCheck className="size-4 text-green-600" /> : <IconX className="size-4 text-red-600" />}
      </div>
    )
  }
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}
