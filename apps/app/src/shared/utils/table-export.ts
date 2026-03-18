/**
 * Table export utilities
 * Exports table data in various formats (SQL, CSV, XLS, JSON)
 */

import type { Row, Table } from "@tanstack/react-table"

type ColumnSchema = {
  name: string
  type: string
  nullable: boolean
  primary: boolean
}

type RelationConfig = {
  collection: string
  valueField: string
  labelField: string
}

export type ColumnSchemaExtended = ColumnSchema & {
  title?: string
  label?: string
  hidden?: boolean
  hiddenTable?: boolean
  readOnly?: boolean
  required?: boolean
  virtual?: boolean
  defaultCell?: any
  format?: (value: any, locale?: string) => string
  fieldType?: 'text' | 'number' | 'email' | 'phone' | 'password' | 'boolean' | 'date' | 'time' | 'datetime' | 'json' | 'array' | 'object' | 'price' | 'enum' | 'select' | 'tiptap' | 'images'
  textarea?: boolean
  enum?: {
    values: string[]
    labels: string[]
  }
  relation?: RelationConfig
  selectOptions?: Array<{
    label: string
    value: string
  }>
}

export type ExportFormat = 'sql' | 'csv' | 'xls' | 'json'

export interface ExportOptions {
  collection: string
  format: ExportFormat
  rows: Row<any>[]
  columns: ColumnSchemaExtended[]
  visibleColumns: Record<string, boolean>
  locale: string
  relationData?: Record<string, Record<any, string>>
  columnOrder?: string[] // Optional: order of columns from table
  translations?: any // Translations for column headers
}

/**
 * Get visible column names based on column visibility state
 */
function getVisibleColumnNames(
  columns: ColumnSchemaExtended[],
  visibleColumns: Record<string, boolean>,
  columnOrder?: string[]
): string[] {
  // If columnOrder is provided, use it to determine order
  if (columnOrder && columnOrder.length > 0) {
    // Filter to only visible columns and maintain order from table
    return columnOrder.filter(colName => {
      // Always include select column
      if (colName === 'select') return true
      // Check visibility state (default to true if not specified)
      return visibleColumns[colName] !== false
    })
  }
  
  // Fallback to schema order
  return columns
    .filter(col => {
      // Always include select column
      if (col.name === 'select') return true
      // Check visibility state (default to true if not specified)
      return visibleColumns[col.name] !== false
    })
    .map(col => col.name)
}

/**
 * Get visible table column names (exclude hidden columns, virtual columns, and system fields)
 * Used for CSV and XLS exports to show only columns visible in the table
 * Excludes columns with hiddenTable: true, hidden: true, and columns hidden via visibleColumns
 */
function getVisibleTableColumns(
  columns: ColumnSchemaExtended[],
  visibleColumns: Record<string, boolean>,
  columnOrder: string[] | undefined,
  collection: string
): string[] {
  // Virtual columns to always exclude
  const alwaysExclude = ['select', 'actions']
  
  // If columnOrder is provided, it already contains only visible columns from table
  // Use it directly, but filter out system fields and ensure proper handling
  if (columnOrder && columnOrder.length > 0) {
    return columnOrder.filter(colName => {
      // Always exclude select and actions
      if (alwaysExclude.includes(colName)) {
        return false
      }
      
      // For schema columns, check if they're hidden (shouldn't happen if columnOrder is correct, but double-check)
      const column = columns.find(c => c.name === colName)
      if (column) {
        // Skip columns with hiddenTable: true (system fields like uuid, created_at, etc.)
        if (column.hiddenTable === true) {
          return false
        }
        // Skip columns with hidden: true
        if (column.hidden === true) {
          return false
        }
      }
      
      // Include suffix and main for roles if they're in columnOrder (they're virtual columns but visible in table)
      // Include other data_in columns
      // Include other columns that are in columnOrder
      return true
    })
  }
  
  // Fallback: get visible columns from schema (if columnOrder not provided)
  const visibleCols: string[] = []
  
  // Add schema columns that are visible in table
  columns.forEach(col => {
    // Skip always excluded columns
    if (alwaysExclude.includes(col.name)) {
      return
    }
    
    // Skip columns with hiddenTable: true (system fields)
    if (col.hiddenTable === true) {
      return
    }
    
    // Skip columns with hidden: true
    if (col.hidden === true) {
      return
    }
    
    // Skip columns explicitly hidden via visibleColumns
    if (visibleColumns[col.name] === false) {
      return
    }
    
    visibleCols.push(col.name)
  })
  
  // Add dynamic data_in columns (excluding data_in.main)
  // Note: This is a fallback, normally columnOrder should be provided
  Object.keys(visibleColumns).forEach(colName => {
    if (colName.startsWith('data_in.') && colName !== 'data_in.main') {
      if (visibleColumns[colName] !== false && !visibleCols.includes(colName)) {
        visibleCols.push(colName)
      }
    }
  })
  
  // For roles, add suffix if it's visible (virtual column)
  if (collection === 'roles') {
    // Check if suffix is visible (not explicitly hidden)
    // For virtual columns, we check if they're in the table's visible columns
    // Since we don't have direct access to table here, we rely on columnOrder being passed
    // In fallback mode, we'll include suffix if it's not explicitly hidden
    if (visibleColumns['suffix'] !== false) {
      if (!visibleCols.includes('suffix')) {
        visibleCols.push('suffix')
      }
    }
  }
  
  return visibleCols
}

/**
 * Get database column names (exclude virtual columns like select, actions, suffix)
 * Used for SQL and JSON exports to ensure only real DB fields are exported
 * Includes all schema columns (even if hiddenTable: true) and dynamic data_in columns
 */
function getDBColumnNames(
  columns: ColumnSchemaExtended[],
  visibleColumns: Record<string, boolean>,
  columnOrder: string[] | undefined,
  collection: string
): string[] {
  // Virtual columns to exclude
  const virtualColumns = ['select', 'actions']
  if (collection === 'roles') {
    virtualColumns.push('suffix')
  }
  
  // Get all columns from schema (including hiddenTable ones) and dynamic data_in columns
  const dbColumns: string[] = []
  
  // Add all schema columns (real DB fields, even if hiddenTable)
  columns.forEach(col => {
    if (!virtualColumns.includes(col.name)) {
      dbColumns.push(col.name)
    }
  })
  
  // Add dynamic data_in columns from columnOrder if provided
  if (columnOrder && columnOrder.length > 0) {
    columnOrder.forEach(colName => {
      // Include dynamic columns from data_in (e.g., data_in.someField)
      if (colName.startsWith('data_in.') && !dbColumns.includes(colName)) {
        dbColumns.push(colName)
      }
    })
  }
  
  // Maintain order from columnOrder if provided, otherwise use schema order
  if (columnOrder && columnOrder.length > 0) {
    const orderedColumns: string[] = []
    // First, add columns in the order they appear in columnOrder
    columnOrder.forEach(colName => {
      if (dbColumns.includes(colName) && !orderedColumns.includes(colName)) {
        orderedColumns.push(colName)
      }
    })
    // Then, add any remaining columns from schema that weren't in columnOrder
    dbColumns.forEach(colName => {
      if (!orderedColumns.includes(colName)) {
        orderedColumns.push(colName)
      }
    })
    return orderedColumns
  }
  
  return dbColumns
}

/**
 * Format date for export
 */
function formatDate(date: Date, includeTime: boolean = false): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  if (!includeTime) {
    return `${year}-${month}-${day}`
  }
  
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * Format cell value for export
 */
function formatCellValue(
  value: any,
  column: ColumnSchemaExtended,
  locale: string,
  relationData?: Record<string, Record<any, string>>
): string {
  if (value == null || value === '') {
    return ''
  }

  // Handle relation fields
  if (column.relation && relationData?.[column.name]) {
    const relationMap = relationData[column.name]
    return relationMap[value] || String(value)
  }

  // Handle JSON fields or object values
  if (column.fieldType === 'json' || (typeof value === 'object' && value !== null && !(value instanceof Date))) {
    // Check if it's already a JSON string
    if (typeof value === 'string') {
      try {
        // Try to parse and re-stringify to ensure it's valid JSON
        const parsed = JSON.parse(value)
        return JSON.stringify(parsed)
      } catch {
        // If parsing fails, it's not JSON, return as is
        return value
      }
    }
    
    // It's an object
    if (typeof value === 'object' && value !== null) {
      // For i18n JSON fields, try to extract locale value
      if (value[locale]) {
        return String(value[locale])
      }
      // Fallback to first available language
      const firstLang = Object.keys(value)[0]
      if (firstLang && typeof value[firstLang] === 'string') {
        return String(value[firstLang])
      }
      // If no locale keys or not i18n structure, serialize the entire object as JSON string
      try {
        return JSON.stringify(value)
      } catch {
        return ''
      }
    }
    return ''
  }

  // Handle dates
  if (column.fieldType === 'date' || column.fieldType === 'datetime' || column.fieldType === 'time') {
    if (value instanceof Date) {
      if (column.fieldType === 'date') {
        return formatDate(value, false)
      } else {
        // datetime or time
        return formatDate(value, true)
      }
    }
    // If it's a string, try to parse it
    if (typeof value === 'string') {
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          if (column.fieldType === 'date') {
            return formatDate(date, false)
          } else {
            return formatDate(date, true)
          }
        }
      } catch {
        // If parsing fails, return as is
      }
    }
    return String(value)
  }

  // Handle booleans
  if (column.fieldType === 'boolean') {
    return value ? '1' : '0'
  }

  // Handle numbers
  if (column.fieldType === 'number' || column.fieldType === 'price') {
    return String(value)
  }

  // Default: check if it's an object (shouldn't happen, but handle it)
  if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }
  
  // Default: convert to string
  return String(value)
}

/**
 * Export to SQL INSERT statements
 */
export function exportToSQL(options: ExportOptions): string {
  const { collection, rows, columns, visibleColumns, locale, relationData, columnOrder } = options
  const dbCols = getDBColumnNames(columns, visibleColumns, columnOrder, collection)
  
  if (rows.length === 0) {
    return `-- No data to export from ${collection}\n`
  }

  const lines: string[] = []
  lines.push(`-- Export from ${collection}`)
  lines.push(`-- Generated at ${new Date().toISOString()}`)
  lines.push(`-- Total rows: ${rows.length}`)
  lines.push('')

  rows.forEach((row, index) => {
    const values: string[] = []
    
    dbCols.forEach(colName => {
      const column = columns.find(c => c.name === colName)
      let formatted: string
      
      if (!column) {
        // Handle dynamic data_in columns (e.g., data_in.someField)
        if (colName.startsWith('data_in.')) {
          const dataInField = colName.replace('data_in.', '')
          const dataIn = row.original.data_in
          if (dataIn) {
            try {
              let parsed: any = dataIn
              if (typeof dataIn === 'string') {
                try {
                  parsed = JSON.parse(dataIn)
                } catch {
                  formatted = ''
                }
              }
              if (parsed && typeof parsed === 'object') {
                const fieldKey = Object.keys(parsed).find(key => key.toLowerCase() === dataInField.toLowerCase())
                if (fieldKey && parsed[fieldKey] !== undefined) {
                  const fieldValue = parsed[fieldKey]
                  if (typeof fieldValue === 'object' && fieldValue !== null && !Array.isArray(fieldValue)) {
                    const localeValue = fieldValue[locale] || fieldValue.en || fieldValue.ru || fieldValue.rs || null
                    if (localeValue !== null && localeValue !== undefined) {
                      if (typeof localeValue === 'object' && 'value' in localeValue) {
                        formatted = String(localeValue.value || '')
                      } else {
                        formatted = String(localeValue)
                      }
                    } else {
                      formatted = ''
                    }
                  } else {
                    formatted = String(fieldValue)
                  }
                } else {
                  formatted = ''
                }
              } else {
                formatted = ''
              }
            } catch {
              formatted = ''
            }
          } else {
            formatted = ''
          }
        } else {
          // Handle case when column is not found
          const value = row.original[colName]
          formatted = value != null ? String(value) : ''
        }
      } else {
        const value = row.original[colName]
        formatted = formatCellValue(value, column, locale, relationData)
      }
      
      // Escape single quotes and wrap in quotes
      const escaped = formatted.replace(/'/g, "''")
      values.push(`'${escaped}'`)
    })

    const columnsList = dbCols.join(', ')
    lines.push(`INSERT INTO ${collection} (${columnsList}) VALUES (${values.join(', ')});`)
  })

  return lines.join('\n')
}

/**
 * Export to CSV
 */
/**
 * Get column header label with translations support
 */
function getColumnHeader(
  colName: string,
  columns: ColumnSchemaExtended[],
  collection: string,
  locale: string,
  translations?: any,
  rows?: Row<any>[]
): string {
  // Skip select column
  if (colName === 'select') return ''
  
  // Find column in schema
  const column = columns.find(c => c.name === colName)
  
  // Handle virtual suffix column for roles
  if (colName === 'suffix' && collection === 'roles') {
    // Try to get title from data_in in first record
    if (rows && rows.length > 0) {
      for (const row of rows) {
        const dataIn = row.original.data_in
        if (dataIn) {
          try {
            let parsed: any = dataIn
            if (typeof dataIn === 'string') {
              try {
                parsed = JSON.parse(dataIn)
              } catch {
                continue
              }
            }
            if (parsed && typeof parsed === 'object') {
              const suffixKey = Object.keys(parsed).find(key => key.toLowerCase() === 'suffix')
              if (suffixKey && parsed[suffixKey] !== undefined) {
                const suffix = parsed[suffixKey]
                if (typeof suffix === 'object' && suffix !== null && !Array.isArray(suffix)) {
                  const localeValue = suffix[locale] || suffix.en || suffix.ru || suffix.rs || null
                  if (localeValue !== null && localeValue !== undefined && typeof localeValue === 'object' && 'title' in localeValue) {
                    return localeValue.title || ''
                  }
                }
              }
            }
          } catch {
            continue
          }
        }
      }
    }
    // Fallback to translation
    const suffixTranslation = translations?.dataTable?.fields?.roles?.suffix
    if (suffixTranslation) return suffixTranslation
    // Final fallback
    return 'Суффикс'
  }
  
  // Handle virtual main column for roles
  if (colName === 'main' && collection === 'roles') {
    // Try to get title from data_in in first record
    if (rows && rows.length > 0) {
      for (const row of rows) {
        const dataIn = row.original.data_in
        if (dataIn) {
          try {
            let parsed: any = dataIn
            if (typeof dataIn === 'string') {
              try {
                parsed = JSON.parse(dataIn)
              } catch {
                continue
              }
            }
            if (parsed && typeof parsed === 'object') {
              const mainKey = Object.keys(parsed).find(key => key.toLowerCase() === 'main')
              if (mainKey && parsed[mainKey] !== undefined) {
                const main = parsed[mainKey]
                if (typeof main === 'object' && main !== null && !Array.isArray(main)) {
                  const localeValue = main[locale] || main.en || main.ru || main.rs || null
                  if (localeValue !== null && localeValue !== undefined && typeof localeValue === 'object' && 'title' in localeValue) {
                    return localeValue.title || ''
                  }
                }
              }
            }
          } catch {
            continue
          }
        }
      }
    }
    // Fallback to translation
    const mainTranslation = translations?.dataTable?.fields?.roles?.main
    if (mainTranslation) return mainTranslation
    // Final fallback
    return 'Главное'
  }
  
  // Try to get translation from translations object
  if (translations?.dataTable?.fields?.[collection]?.[colName]) {
    return translations.dataTable.fields[collection][colName]
  }
  
  // Use column label if available
  if (column?.label) {
    return column.label
  }
  
  // Fallback: Russian translations for common fields (if locale is ru)
  if (locale === 'ru') {
    const ruFallbacks: Record<string, Record<string, string>> = {
      roles: {
        id: 'ID',
        uuid: 'UUID',
        title: 'Название',
        name: 'Имя',
        description: 'Описание',
        is_system: 'Системная роль',
        order: 'Порядок',
        suffix: 'Суффикс',
        xaid: 'Проект',
        created_at: 'Создано',
        updated_at: 'Обновлено',
        data_in: 'Данные (JSON)',
        actions: 'Действия',
      },
    }
    if (ruFallbacks[collection]?.[colName]) {
      return ruFallbacks[collection][colName]
    }
  }
  
  // Fallback to column name
  return colName
}

/**
 * Get value for virtual columns (suffix, main)
 */
function getVirtualColumnValue(
  colName: string,
  row: Row<any>,
  collection: string,
  locale: string
): string {
  if (collection === 'roles' && (colName === 'suffix' || colName === 'main')) {
    const dataIn = row.original.data_in
    if (dataIn) {
      try {
        let parsed: any = dataIn
        if (typeof dataIn === 'string') {
          try {
            parsed = JSON.parse(dataIn)
          } catch {
            return ''
          }
        }
        if (parsed && typeof parsed === 'object') {
          const fieldKey = Object.keys(parsed).find(key => key.toLowerCase() === colName.toLowerCase())
          if (fieldKey && parsed[fieldKey] !== undefined) {
            const fieldValue = parsed[fieldKey]
            if (typeof fieldValue === 'object' && fieldValue !== null && !Array.isArray(fieldValue)) {
              const localeValue = fieldValue[locale] || fieldValue.en || fieldValue.ru || fieldValue.rs || null
              if (localeValue !== null && localeValue !== undefined) {
                if (typeof localeValue === 'object' && 'value' in localeValue) {
                  return String(localeValue.value || '')
                }
                return String(localeValue)
              }
            } else if (fieldValue !== null && fieldValue !== undefined) {
              // If field is a simple value (string, number, etc.)
              return String(fieldValue)
            }
          }
        }
      } catch {
        return ''
      }
    }
  }
  return ''
}

export function exportToCSV(options: ExportOptions): string {
  const { rows, columns, visibleColumns, locale, relationData, columnOrder, collection, translations } = options
  const dbCols = getVisibleTableColumns(columns, visibleColumns, columnOrder, collection)
  
  if (rows.length === 0) {
    return ''
  }

  const lines: string[] = []
  
  // Header row
  const headers = dbCols
    .map(colName => getColumnHeader(colName, columns, collection, locale, translations, rows))
    .filter(h => h !== '') // Remove empty headers
  lines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','))

  // Data rows
  rows.forEach(row => {
    const values: string[] = []
    
    dbCols.forEach(colName => {
      const column = columns.find(c => c.name === colName)
      let formatted: string
      
      if (!column) {
        // Handle virtual columns (suffix, main) for roles
        if (collection === 'roles' && (colName === 'suffix' || colName === 'main')) {
          formatted = getVirtualColumnValue(colName, row, collection, locale)
        }
        // Handle dynamic data_in columns (e.g., data_in.someField)
        else if (colName.startsWith('data_in.')) {
          const dataInField = colName.replace('data_in.', '')
          const dataIn = row.original.data_in
          if (dataIn) {
            try {
              let parsed: any = dataIn
              if (typeof dataIn === 'string') {
                try {
                  parsed = JSON.parse(dataIn)
                } catch {
                  formatted = ''
                }
              }
              if (parsed && typeof parsed === 'object') {
                const fieldKey = Object.keys(parsed).find(key => key.toLowerCase() === dataInField.toLowerCase())
                if (fieldKey && parsed[fieldKey] !== undefined) {
                  const fieldValue = parsed[fieldKey]
                  if (typeof fieldValue === 'object' && fieldValue !== null && !Array.isArray(fieldValue)) {
                    const localeValue = fieldValue[locale] || fieldValue.en || fieldValue.ru || fieldValue.rs || null
                    if (localeValue !== null && localeValue !== undefined) {
                      if (typeof localeValue === 'object' && 'value' in localeValue) {
                        formatted = String(localeValue.value || '')
                      } else {
                        formatted = String(localeValue)
                      }
                    } else {
                      formatted = ''
                    }
                  } else {
                    formatted = String(fieldValue)
                  }
                } else {
                  formatted = ''
                }
              } else {
                formatted = ''
              }
            } catch {
              formatted = ''
            }
          } else {
            formatted = ''
          }
        } else {
          // Handle case when column is not found
          const value = row.original[colName]
          formatted = value != null ? String(value) : ''
        }
      } else {
        const value = row.original[colName]
        formatted = formatCellValue(value, column, locale, relationData)
      }
      
      // Escape quotes and wrap in quotes
      const escaped = formatted.replace(/"/g, '""')
      values.push(`"${escaped}"`)
    })

    lines.push(values.join(','))
  })

  return lines.join('\n')
}

/**
 * Export to XLS (Excel) - using CSV format with tab separator
 */
export function exportToXLS(options: ExportOptions): string {
  const { rows, columns, visibleColumns, locale, relationData, columnOrder, collection, translations } = options
  const dbCols = getVisibleTableColumns(columns, visibleColumns, columnOrder, collection)
  
  if (rows.length === 0) {
    return ''
  }

  const lines: string[] = []
  
  // Header row
  const headers = dbCols
    .map(colName => getColumnHeader(colName, columns, collection, locale, translations, rows))
    .filter(h => h !== '') // Remove empty headers
  lines.push(headers.join('\t'))

  // Data rows
  rows.forEach(row => {
    const values: string[] = []
    
    dbCols.forEach(colName => {
      const column = columns.find(c => c.name === colName)
      let formatted: string
      
      if (!column) {
        // Handle virtual columns (suffix, main) for roles
        if (collection === 'roles' && (colName === 'suffix' || colName === 'main')) {
          formatted = getVirtualColumnValue(colName, row, collection, locale)
        }
        // Handle dynamic data_in columns (e.g., data_in.someField)
        else if (colName.startsWith('data_in.')) {
          const dataInField = colName.replace('data_in.', '')
          const dataIn = row.original.data_in
          if (dataIn) {
            try {
              let parsed: any = dataIn
              if (typeof dataIn === 'string') {
                try {
                  parsed = JSON.parse(dataIn)
                } catch {
                  formatted = ''
                }
              }
              if (parsed && typeof parsed === 'object') {
                const fieldKey = Object.keys(parsed).find(key => key.toLowerCase() === dataInField.toLowerCase())
                if (fieldKey && parsed[fieldKey] !== undefined) {
                  const fieldValue = parsed[fieldKey]
                  if (typeof fieldValue === 'object' && fieldValue !== null && !Array.isArray(fieldValue)) {
                    const localeValue = fieldValue[locale] || fieldValue.en || fieldValue.ru || fieldValue.rs || null
                    if (localeValue !== null && localeValue !== undefined) {
                      if (typeof localeValue === 'object' && 'value' in localeValue) {
                        formatted = String(localeValue.value || '')
                      } else {
                        formatted = String(localeValue)
                      }
                    } else {
                      formatted = ''
                    }
                  } else {
                    formatted = String(fieldValue)
                  }
                } else {
                  formatted = ''
                }
              } else {
                formatted = ''
              }
            } catch {
              formatted = ''
            }
          } else {
            formatted = ''
          }
        } else {
          // Handle case when column is not found
          const value = row.original[colName]
          formatted = value != null ? String(value) : ''
        }
      } else {
        const value = row.original[colName]
        formatted = formatCellValue(value, column, locale, relationData)
      }
      
      // Replace tabs and newlines
      const cleaned = formatted.replace(/\t/g, ' ').replace(/\n/g, ' ')
      values.push(cleaned)
    })

    lines.push(values.join('\t'))
  })

  return lines.join('\n')
}

/**
 * Export to JSON
 */
export function exportToJSON(options: ExportOptions): string {
  const { rows, columns, visibleColumns, locale, relationData, columnOrder, collection } = options
  const dbCols = getDBColumnNames(columns, visibleColumns, columnOrder, collection)
  
  const data = rows.map(row => {
    const record: Record<string, any> = {}
    
    dbCols.forEach(colName => {
      const column = columns.find(c => c.name === colName)
      
      if (!column) {
        // Handle dynamic data_in columns (e.g., data_in.someField)
        if (colName.startsWith('data_in.')) {
          const dataInField = colName.replace('data_in.', '')
          const dataIn = row.original.data_in
          if (dataIn) {
            try {
              let parsed: any = dataIn
              if (typeof dataIn === 'string') {
                try {
                  parsed = JSON.parse(dataIn)
                } catch {
                  record[colName] = ''
                  return
                }
              }
              if (parsed && typeof parsed === 'object') {
                const fieldKey = Object.keys(parsed).find(key => key.toLowerCase() === dataInField.toLowerCase())
                if (fieldKey && parsed[fieldKey] !== undefined) {
                  const fieldValue = parsed[fieldKey]
                  if (typeof fieldValue === 'object' && fieldValue !== null && !Array.isArray(fieldValue)) {
                    const localeValue = fieldValue[locale] || fieldValue.en || fieldValue.ru || fieldValue.rs || null
                    if (localeValue !== null && localeValue !== undefined) {
                      if (typeof localeValue === 'object' && 'value' in localeValue) {
                        record[colName] = localeValue.value != null ? localeValue.value : ''
                      } else {
                        record[colName] = localeValue
                      }
                    } else {
                      record[colName] = ''
                    }
                  } else {
                    record[colName] = fieldValue
                  }
                } else {
                  record[colName] = ''
                }
              } else {
                record[colName] = ''
              }
            } catch {
              record[colName] = ''
            }
          } else {
            record[colName] = ''
          }
        } else {
          // Handle case when column is not found
          const value = row.original[colName]
          record[colName] = value != null ? value : ''
        }
        return
      }

      const value = row.original[colName]
      
      // For JSON fields (like data_in), keep the object structure
      if (column.fieldType === 'json') {
        if (typeof value === 'object' && value !== null) {
          record[colName] = value
        } else if (typeof value === 'string') {
          // Try to parse JSON string
          try {
            record[colName] = JSON.parse(value)
          } catch {
            record[colName] = value
          }
        } else {
          record[colName] = value
        }
      } else {
        // Format other values
        record[colName] = formatCellValue(value, column, locale, relationData)
      }
    })

    return record
  })

  return JSON.stringify(data, null, 2)
}

/**
 * Main export function
 */
export function exportTable(options: ExportOptions): string {
  switch (options.format) {
    case 'sql':
      return exportToSQL(options)
    case 'csv':
      return exportToCSV(options)
    case 'xls':
      return exportToXLS(options)
    case 'json':
      return exportToJSON(options)
    default:
      throw new Error(`Unsupported export format: ${options.format}`)
  }
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'sql':
      return 'sql'
    case 'csv':
      return 'csv'
    case 'xls':
      return 'xls'
    case 'json':
      return 'json'
  }
}

/**
 * Get MIME type for format
 */
export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'sql':
      return 'text/plain'
    case 'csv':
      return 'text/csv;charset=utf-8'
    case 'xls':
      return 'application/vnd.ms-excel'
    case 'json':
      return 'application/json'
  }
}

/**
 * Add BOM (Byte Order Mark) for UTF-8 CSV files to ensure proper encoding in Excel
 */
export function addBOM(text: string): string {
  return '\uFEFF' + text
}
