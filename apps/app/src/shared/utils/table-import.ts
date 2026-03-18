/**
 * Table import utilities
 * Imports table data from various formats (CSV, XLS, JSON, SQL)
 */

export type ImportFormat = 'csv' | 'xls' | 'json' | 'sql'

export interface ImportResult {
  success: boolean
  imported: number
  errors: string[]
  warnings: string[]
}

export interface ParsedRow {
  [key: string]: any
}

/**
 * Parse CSV content
 */
export function parseCSV(content: string): ParsedRow[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  // Parse header
  const headerLine = lines[0]
  const headers: string[] = []
  let currentField = ''
  let inQuotes = false
  
  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i]
    if (char === '"') {
      if (inQuotes && headerLine[i + 1] === '"') {
        currentField += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      headers.push(currentField.trim())
      currentField = ''
    } else {
      currentField += char
    }
  }
  headers.push(currentField.trim())
  
  // Parse data rows
  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const row: ParsedRow = {}
    let currentField = ''
    let fieldIndex = 0
    inQuotes = false
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          currentField += '"'
          j++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        if (fieldIndex < headers.length) {
          row[headers[fieldIndex]] = currentField.trim()
        }
        currentField = ''
        fieldIndex++
      } else {
        currentField += char
      }
    }
    // Add last field
    if (fieldIndex < headers.length) {
      row[headers[fieldIndex]] = currentField.trim()
    }
    
    rows.push(row)
  }
  
  return rows
}

/**
 * Parse XLS content (tab-separated)
 */
export function parseXLS(content: string): ParsedRow[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  // Parse header
  const headers = lines[0].split('\t').map(h => h.trim())
  
  // Parse data rows
  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t')
    const row: ParsedRow = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || ''
    })
    rows.push(row)
  }
  
  return rows
}

/**
 * Parse JSON content
 */
export function parseJSON(content: string): ParsedRow[] {
  try {
    const data = JSON.parse(content)
    if (Array.isArray(data)) {
      return data
    } else if (typeof data === 'object' && data !== null) {
      return [data]
    }
    return []
  } catch (e) {
    throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`)
  }
}

/**
 * Parse SQL INSERT statements
 */
export function parseSQL(content: string, collection: string): ParsedRow[] {
  const rows: ParsedRow[] = []
  const insertRegex = new RegExp(
    `INSERT\\s+INTO\\s+${collection}\\s*\\(([^)]+)\\)\\s*VALUES\\s*\\(([^)]+)\\)`,
    'gi'
  )
  
  let match
  while ((match = insertRegex.exec(content)) !== null) {
    const columnsStr = match[1]
    const valuesStr = match[2]
    
    const columns = columnsStr.split(',').map(c => c.trim())
    const values: string[] = []
    let currentValue = ''
    let inQuotes = false
    let quoteChar = ''
    
    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i]
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar && inQuotes) {
        if (valuesStr[i + 1] === quoteChar) {
          currentValue += char
          i++ // Skip escaped quote
        } else {
          inQuotes = false
        }
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim())
        currentValue = ''
      } else {
        currentValue += char
      }
    }
    values.push(currentValue.trim())
    
    const row: ParsedRow = {}
    columns.forEach((col, index) => {
      let value = values[index] || ''
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      // Unescape quotes
      value = value.replace(/''/g, "'").replace(/""/g, '"')
      row[col] = value
    })
    
    rows.push(row)
  }
  
  return rows
}

/**
 * Parse file content based on format
 */
export function parseImportFile(
  content: string,
  format: ImportFormat,
  collection: string
): ParsedRow[] {
  switch (format) {
    case 'csv':
      return parseCSV(content)
    case 'xls':
      return parseXLS(content)
    case 'json':
      return parseJSON(content)
    case 'sql':
      return parseSQL(content, collection)
    default:
      throw new Error(`Unsupported import format: ${format}`)
  }
}

/**
 * Import rows into collection via API
 */
export async function importRows(
  collection: string,
  rows: ParsedRow[],
  onProgress?: (imported: number, total: number) => void
): Promise<ImportResult> {
  const errors: string[] = []
  const warnings: string[] = []
  let imported = 0
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const res = await fetch(`/api/admin/${encodeURIComponent(collection)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(row),
      })
      
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        errors.push(`Row ${i + 1}: ${json.error || `HTTP ${res.status}`}`)
      } else {
        imported++
        if (onProgress) {
          onProgress(imported, rows.length)
        }
      }
    } catch (e) {
      errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }
  
  return {
    success: errors.length === 0,
    imported,
    errors,
    warnings,
  }
}
