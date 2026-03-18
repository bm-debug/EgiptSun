import { COLLECTION_GROUPS } from "@/shared/collections"
import { getCollection } from "@/shared/collections/getCollection"
import { withEditorGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { getPostgresClient, executeRawQuery, createDb } from '@/shared/repositories/utils'
import { type SortingState, type ColumnSort } from "@tanstack/react-table"
import { LanguageCode } from "@/lib/getInitialLocale"
import { camelToSnake } from "@/shared/utils/case-conversion"
import { isValidCollection } from "@/shared/utils/collection-validation"
import { parseStateFromUrl, type AdminState, type AdminFilter } from "@/shared/utils/admin-state-parser"

interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  ordinal_position: number
  [key: string]: unknown
}

function q(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"'
}

const onRequestGet = async (context: AuthenticatedRequestContext) => {
    const { request, env } = context
    const url = new URL(request.url)
  
    const state = parseStateFromUrl(url)
  
    // Validate collection
    if (!isValidCollection(state.collection)) {
      return new Response(
        JSON.stringify({ error: "Invalid collection", state }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }
  
    try {
      const db = createDb()
      const client = getPostgresClient(db)
      
      // Get table schema
      const schemaResult = await executeRawQuery<ColumnInfo>(
        client,
        `SELECT column_name, data_type, is_nullable, column_default, ordinal_position
         FROM information_schema.columns
         WHERE table_name = $1
         ORDER BY ordinal_position`,
        [state.collection]
      )
  
      if (!schemaResult || schemaResult.length === 0) {
        return new Response(
          JSON.stringify({ error: "Collection not found or has no columns", state }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        )
      }
  
      // Get collection config for virtual fields
      const collectionConfig = getCollection(state.collection)

      const defaultSorting = collectionConfig.__defaultSort

      const locale = state.locale

      const sorting: SortingState = state.sorting || defaultSorting        
      
      const columns = schemaResult.map((col: ColumnInfo) => ({
        name: col.column_name,
        type: col.data_type.toUpperCase(),
        nullable: col.is_nullable === 'YES',
        primary: false, // Will be determined separately if needed
      }))

      
      // Add virtual fields to schema
      const virtualFields: any[] = []
      for (const key in collectionConfig) {
        const fieldConfig = (collectionConfig as any)[key]
        if (fieldConfig?.options?.virtual && fieldConfig?.options?.value) {
          virtualFields.push({
            name: key,
            type: fieldConfig.options.type || 'TEXT',
            nullable: !fieldConfig.options.required,
            primary: false,
            virtual: true,
          })
        }
      }
      
      // Merge real and virtual columns
      const allColumns = [...columns, ...virtualFields]
  
      const hasDeletedAt = schemaResult.some((c: ColumnInfo) => c.column_name.toLowerCase() === 'deleted_at')
      
      // Build WHERE clause
      const whereParts: string[] = []
      const bindings: any[] = []
      
      if (hasDeletedAt) {
        whereParts.push(`${q('deleted_at')} IS NULL`)
      }
      
      // Apply column filters from state.filters (supports real DB columns and JSON fields with dot notation)
      if (Array.isArray(state.filters) && state.filters.length > 0) {
        const allowedOps = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "like", "in"])
        const realColumnNames = new Set(columns.map((c: { name: string }) => c.name))
        
        // Build map of JSON columns (jsonb type or configured as json)
        const jsonColumns = new Set<string>()
        for (const col of schemaResult) {
          const fieldConfig = (collectionConfig as any)[col.column_name]
          const isJsonField = fieldConfig?.options?.type === 'json' || col.data_type === 'jsonb'
          if (isJsonField) {
            jsonColumns.add(col.column_name)
          }
        }
  
        for (const f of state.filters) {
          if (!f || typeof f.field !== "string" || !allowedOps.has(f.op)) continue
          
          // Check if field uses dot notation (e.g., "dataIn.contractor_caid")
          const fieldParts = f.field.split('.')
          const isJsonPath = fieldParts.length > 1
          
          if (isJsonPath) {
            // Handle JSON field path (e.g., "dataIn.contractor_caid")
            const jsonColumnCamel = fieldParts[0]
            const jsonPath = fieldParts.slice(1)
            
            // Convert camelCase to snake_case and check both variants
            const jsonColumnSnake = camelToSnake(jsonColumnCamel)
            const jsonColumn = jsonColumns.has(jsonColumnCamel) 
              ? jsonColumnCamel 
              : jsonColumns.has(jsonColumnSnake) 
                ? jsonColumnSnake 
                : null
            
            // Verify that the base column is a JSON column
            if (!jsonColumn) {
              continue // Skip if base column is not a JSON column
            }
            
            // Build JSON path expression for PostgreSQL
            // For "dataIn.contractor_caid": "data_in"::jsonb->>'contractor_caid'
            // For nested paths like "dataIn.nested.field": "data_in"::jsonb->'nested'->>'field'
            let jsonExpr = `${q(jsonColumn)}::jsonb`
            
            // For all but the last part, use -> (returns jsonb)
            // For the last part, use ->> (returns text)
            for (let i = 0; i < jsonPath.length; i++) {
              const isLast = i === jsonPath.length - 1
              const pathKey = jsonPath[i]
              // Escape single quotes in path key
              const escapedKey = pathKey.replace(/'/g, "''")
              jsonExpr += isLast ? `->>'${escapedKey}'` : `->'${escapedKey}'`
            }
            
            const colExpr = jsonExpr

            switch (f.op) {
              case "eq":
                whereParts.push(`${colExpr} = $${bindings.length + 1}`)
                bindings.push(f.value)
                break
              case "neq":
                whereParts.push(`${colExpr} != $${bindings.length + 1}`)
                bindings.push(f.value)
                break
              case "gt":
                whereParts.push(`${colExpr} > $${bindings.length + 1}`)
                bindings.push(f.value)
                break
              case "gte":
                whereParts.push(`${colExpr} >= $${bindings.length + 1}`)
                bindings.push(f.value)
                break
              case "lt":
                whereParts.push(`${colExpr} < $${bindings.length + 1}`)
                bindings.push(f.value)
                break
              case "lte":
                whereParts.push(`${colExpr} <= $${bindings.length + 1}`)
                bindings.push(f.value)
                break
              case "like": {
                whereParts.push(`${colExpr} LIKE $${bindings.length + 1}`)
                // Default to contains match
                const v = typeof f.value === "string" ? `%${f.value}%` : String(f.value)
                bindings.push(v)
                break
              }
              case "in": {
                // Support array or comma-separated string
                const valuesArray = Array.isArray(f.value)
                  ? (f.value as any[])
                  : typeof f.value === "string"
                    ? (f.value as string).split(",").map((s) => s.trim()).filter((s) => s.length > 0)
                    : []
                if (valuesArray.length === 0) {
                  // No values -> force false condition to avoid SQL error
                  whereParts.push("1 = 0")
                  break
                }
                const placeholders = valuesArray.map((_, i) => `$${bindings.length + i + 1}`).join(", ")
                whereParts.push(`${colExpr} IN (${placeholders})`)
                bindings.push(...valuesArray)
                break
              }
            }
          } else {
            // Handle regular column (non-JSON path)
            if (!realColumnNames.has(f.field)) continue // skip virtual/non-existent fields

            const colExpr = q(f.field)

            switch (f.op) {
              case "eq":
                if (state.collection === "taxonomy" && f.field === "entity") {
                  whereParts.push(`LOWER(${colExpr}) = LOWER($${bindings.length + 1})`)
                  bindings.push(f.value)
                } else {
                  whereParts.push(`${colExpr} = $${bindings.length + 1}`)
                  bindings.push(f.value)
                }
                break
              case "neq":
                whereParts.push(`${colExpr} != $${bindings.length + 1}`)
                bindings.push(f.value)
                break
              case "gt":
                whereParts.push(`${colExpr} > $${bindings.length + 1}`)
                bindings.push(f.value)
                break
              case "gte":
                whereParts.push(`${colExpr} >= $${bindings.length + 1}`)
                bindings.push(f.value)
                break
              case "lt":
                whereParts.push(`${colExpr} < $${bindings.length + 1}`)
                bindings.push(f.value)
                break
              case "lte":
                whereParts.push(`${colExpr} <= $${bindings.length + 1}`)
                bindings.push(f.value)
                break
              case "like": {
                whereParts.push(`${colExpr} LIKE $${bindings.length + 1}`)
                // Default to contains match
                const v = typeof f.value === "string" ? `%${f.value}%` : String(f.value)
                bindings.push(v)
                break
              }
              case "in": {
                // Support array or comma-separated string
                const valuesArray = Array.isArray(f.value)
                  ? (f.value as any[])
                  : typeof f.value === "string"
                    ? (f.value as string).split(",").map((s) => s.trim()).filter((s) => s.length > 0)
                    : []
                if (valuesArray.length === 0) {
                  // No values -> force false condition to avoid SQL error
                  whereParts.push("1 = 0")
                  break
                }
                const placeholders = valuesArray.map((_, i) => `$${bindings.length + i + 1}`).join(", ")
                whereParts.push(`${colExpr} IN (${placeholders})`)
                bindings.push(...valuesArray)
                break
              }
            }
          }
        }
      }
  
      // Add search condition if search is provided (supports AND/OR operators)
      if (state.search) {
        // Split search by OR (case-sensitive), then by AND inside each group
        const orGroups = state.search
          .split('OR')
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
          .map((part) =>
            part
              .split('AND')
              .map((p) => p.trim())
              .filter((p) => p.length > 0)
          )
          .filter((group) => group.length > 0)
  
        // Get all TEXT/INTEGER columns for search
        const searchableColumns = columns.filter((col: { type: string }) => col.type === 'TEXT' || col.type === 'INTEGER')
  
        if (orGroups.length > 0 && searchableColumns.length > 0) {
          const groupClauses: string[] = []
  
          for (const group of orGroups) {
            const andClauses: string[] = []
  
            for (const term of group) {
              const placeholders: string[] = []
              for (const col of searchableColumns) {
                placeholders.push(`${q(col.name)} LIKE $${bindings.length + 1}`)
                bindings.push(`%${term}%`)
              }
              // For this term, match any searchable column
              andClauses.push(`(${placeholders.join(' OR ')})`)
            }
  
            if (andClauses.length > 0) {
              // All terms in group must match (AND)
              groupClauses.push(`(${andClauses.join(' AND ')})`)
            }
          }
  
          if (groupClauses.length > 0) {
            // Any group can match (OR)
            whereParts.push(`(${groupClauses.join(' OR ')})`)
          }
        }
      }
      
      const where = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : ''
  
      // Build ORDER BY clause from sorting
      const orderByParts: string[] = []
      if (sorting && sorting.length > 0) {
        // Get real column names (exclude virtual fields)
        const realColumnNames = new Set(columns.map((c: { name: string }) => c.name))
        const realColumnDbTypes = new Map(
          schemaResult.map((col: ColumnInfo) => [col.column_name, String(col.data_type || "").toLowerCase()])
        )
        
        for (const sortItem of sorting) {
          // Only allow sorting by real database columns
          if (sortItem.id && realColumnNames.has(sortItem.id)) {
            const direction = sortItem.desc ? 'DESC' : 'ASC'
            
            // Check if column has i18n: true in collection config
            const fieldConfig = (collectionConfig as any)[sortItem.id]
            const isI18nField = fieldConfig?.options?.i18n === true
            
            // For i18n fields, extract value from JSON by locale
            // PostgreSQL JSON operator: column->>'locale' extracts text value
            const dbType = realColumnDbTypes.get(sortItem.id)
            const isJsonDbType = dbType === 'json' || dbType === 'jsonb'
            if (isI18nField && isJsonDbType) {
              orderByParts.push(`${q(sortItem.id)}->>'${locale}' ${direction}`)
            } else {
              orderByParts.push(`${q(sortItem.id)} ${direction}`)
            }
          }
        }
      }
      const orderBy = orderByParts.length > 0 ? `ORDER BY ${orderByParts.join(', ')}` : ''
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM ${q(state.collection)} ${where}`
      const countResult = await executeRawQuery<{ total: string | number }>(
        client,
        countQuery,
        bindings
      )
  
      const total = Number(countResult[0]?.total) || 0
  
      // Get data with pagination and sorting
      const offset = (state.page - 1) * state.pageSize
      const dataQuery = `SELECT * FROM ${q(state.collection)} ${where} ${orderBy} LIMIT $${bindings.length + 1} OFFSET $${bindings.length + 2}`
      const dataResult = await executeRawQuery(
        client,
        dataQuery,
        [...bindings, state.pageSize, offset]
      )
  
      // Process data: parse JSON fields and compute virtual fields
      const processedData = await Promise.all(
        (dataResult || []).map(async (row: any) => {
          const processed = { ...row }
          
          // Parse JSON fields based on collection config
          for (const col of columns) {
            const fieldConfig = (collectionConfig as any)[col.name]
            const isJsonField = fieldConfig?.options?.type === 'json'
            
            if (isJsonField && processed[col.name] != null) {
              try {
                const value = processed[col.name]
                if (typeof value === 'string') {
                  const trimmed = value.trim()
                  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    processed[col.name] = JSON.parse(value)
                  }
                }
              } catch {
                // Not valid JSON, keep as is
                console.warn(`Failed to parse JSON field ${col.name} for collection ${state.collection}`)
              }
            } else if (col.type === 'TEXT' && processed[col.name]) {
              // Fallback: try parsing TEXT fields that look like JSON (for backward compatibility)
              try {
                const value = processed[col.name]
                if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                  processed[col.name] = JSON.parse(value)
                }
              } catch {
                // Not JSON, keep as is
              }
            }
          }
          
          // Compute virtual fields
          for (const vField of virtualFields) {
            const fieldConfig = (collectionConfig as any)[vField.name]
            if (fieldConfig?.options?.value) {
              try {
                processed[vField.name] = await fieldConfig.options.value(processed)
              } catch (error) {
                console.error(`Error computing virtual field ${vField.name}:`, error)
                processed[vField.name] = null
              }
            }
          }
          
          // Remove password fields from response
          for (const key in collectionConfig) {
            const fieldConfig = (collectionConfig as any)[key]
            if (fieldConfig?.options?.type === 'password') {
              delete processed[key]
            }
          }
          
          return processed
        })
      )
  
      return new Response(
        JSON.stringify({
          success: true,
          state,
          schema: {
            columns: allColumns,
            total,
            totalPages: Math.ceil(total / state.pageSize),
          },
          data: processedData,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    } catch (error) {
      console.error("State API error:", error)
      return new Response(
        JSON.stringify({
          error: "Failed to fetch collection data",
          details: String(error),
          state,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }
  }

  export const getAdminState = withEditorGuard(onRequestGet)