/// <reference types="@cloudflare/workers-types" />

import { AuthenticatedContext } from '@/shared/types'
import { COLLECTION_GROUPS } from '@/shared/collections'
import { generateAid } from '@/shared/generate-aid'
import { getCollection } from '@/shared/collections/getCollection'
import { preparePassword, validatePassword, validatePasswordMatch } from '@/shared/password'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { getPostgresClient, executeRawQuery, createDb } from '@/shared/repositories/utils'

function isAllowedCollection(name: string): boolean {
  const all = Object.values(COLLECTION_GROUPS).flat()
  return all.includes(name)
}

function q(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"'
}

function generateUUID(): string {
  return crypto.randomUUID()
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validateEmailFields(collection: string, data: Record<string, any>): string | null {
  const collectionConfig = getCollection(collection)
  
  for (const [fieldName, value] of Object.entries(data)) {
    const columnConfig = (collectionConfig as any)[fieldName]
    if (columnConfig?.options?.type === 'email' && value != null && value !== '') {
      if (!isValidEmail(String(value))) {
        return `Invalid email format for field: ${fieldName}`
      }
    }
  }
  
  return null
}

async function validatePasswordFields(collection: string, data: Record<string, any>): Promise<string | null> {
  const collectionConfig = getCollection(collection)
  
  for (const [fieldName, value] of Object.entries(data)) {
    const columnConfig = (collectionConfig as any)[fieldName]
    if (columnConfig?.options?.type === 'password' && value != null && value !== '') {
      // Check password requirements
      const validation = validatePassword(String(value))
      if (!validation.valid) {
        return `${fieldName}: ${validation.error}`
      }
      
      // Check for confirmation field
      const confirmFieldName = `${fieldName}_confirm`
      const confirmValue = data[confirmFieldName]
      
      if (!confirmValue) {
        return `${fieldName}: Password confirmation is required`
      }
      
      // Check passwords match
      const matchValidation = validatePasswordMatch(String(value), String(confirmValue))
      if (!matchValidation.valid) {
        return `${fieldName}: ${matchValidation.error}`
      }
    }
  }
  
  return null
}

async function hashPasswordFields(collection: string, data: Record<string, any>): Promise<void> {
  const collectionConfig = getCollection(collection)
  
  for (const [fieldName, value] of Object.entries(data)) {
    const columnConfig = (collectionConfig as any)[fieldName]
    if (columnConfig?.options?.type === 'password' && value != null && value !== '') {
      // For users collection, use preparePassword to generate hash and salt
      if (collection === 'users' && fieldName === 'password_hash') {
        const { hashedPassword, salt } = await preparePassword(String(value))
        data[fieldName] = hashedPassword
        data['salt'] = salt
      } else {
        // For other collections or fields, use preparePassword but only save hash
        const { hashedPassword } = await preparePassword(String(value))
        data[fieldName] = hashedPassword
      }
      
      // Remove confirmation field from data (it shouldn't be saved to DB)
      delete data[`${fieldName}_confirm`]
    }
  }
}

async function handleGet(context: AuthenticatedRequestContext): Promise<Response> {
  const { request, params } = context
  const collection = params?.collection as string
  if (!collection || !isAllowedCollection(collection)) {
    return new Response(JSON.stringify({ error: 'Invalid collection' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('p') || 1))
  const pageSize = Math.max(1, Number(url.searchParams.get('ps') || 20))

  try {
    const db = createDb()
    const client = getPostgresClient(db)
    
    // Detect if collection has deleted_at
    const pragmaResult = await executeRawQuery<{ column_name: string; data_type: string }>(
      client,
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = $1`,
      [collection]
    )
    const hasDeletedAt = Boolean(pragmaResult?.some((c: { column_name: string }) => c.column_name.toLowerCase() === 'deleted_at'))
    const where = hasDeletedAt ? `WHERE ${q('deleted_at')} IS NULL` : ''

    const countResult = await executeRawQuery<{ total: string | number }>(
      client,
      `SELECT COUNT(*) as total FROM ${q(collection)} ${where}`
    )
    const total = Number(countResult[0]?.total) || 0

    const offset = (page - 1) * pageSize
    const rowsResult = await executeRawQuery(
      client,
      `SELECT * FROM ${q(collection)} ${where} LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    )

    // Parse JSON fields based on collection config
    const collectionConfig = getCollection(collection)
    const processedData = (rowsResult || []).map((row: any) => {
      const processed = { ...row }
      
      // Get column info for type checking
      const columnsInfo = pragmaResult as { column_name: string; data_type: string }[] || []
      
      for (const col of columnsInfo) {
        const fieldConfig = (collectionConfig as any)[col.column_name]
        const isJsonField = fieldConfig?.options?.type === 'json'
        
        if (isJsonField && processed[col.column_name] != null) {
          try {
            const value = processed[col.column_name]
            if (typeof value === 'string') {
              const trimmed = value.trim()
              if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                processed[col.column_name] = JSON.parse(value)
              }
            }
          } catch {
            // Not valid JSON, keep as is
            console.warn(`Failed to parse JSON field ${col.column_name} for collection ${collection}`)
          }
        } else if (col.data_type === 'text' && processed[col.column_name]) {
          // Fallback: try parsing TEXT fields that look like JSON (for backward compatibility)
          try {
            const value = processed[col.column_name]
            if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
              processed[col.column_name] = JSON.parse(value)
            }
          } catch {
            // Not JSON, keep as is
          }
        }
      }
      
      return processed
    })

    return new Response(JSON.stringify({
      success: true,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      data: processedData,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Query failed', details: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function handlePost(context: AuthenticatedRequestContext): Promise<Response> {
  const { env, params, request } = context
  const collection = params?.collection as string

  if (!collection || !isAllowedCollection(collection)) {
    return new Response(JSON.stringify({ error: 'Invalid collection' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: Record<string, any> | undefined = undefined
  let processedBody: Record<string, any> = {}
  let keys: string[] = []
  let values: any[] = []
  let sql: string = ''
  let data: Record<string, any> = {}
  
  try {
    body = await request.json() as Record<string, any>
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    console.log(`[handlePost ${collection}] Received body:`, JSON.stringify(body, null, 2))

    // Validate email fields
    const emailError = validateEmailFields(collection, body)
    if (emailError) {
      return new Response(JSON.stringify({ error: emailError }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate password fields
    const passwordError = await validatePasswordFields(collection, body)
    if (passwordError) {
      return new Response(JSON.stringify({ error: passwordError }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Hash password fields
    await hashPasswordFields(collection, body)

    // Process hooks and virtual fields
    const collectionConfig = getCollection(collection)
    processedBody = {}
    
    // Initialize data_in if it doesn't exist
    if (!processedBody.data_in && body.data_in) {
      processedBody.data_in = typeof body.data_in === 'string' ? JSON.parse(body.data_in) : { ...body.data_in }
    } else if (!processedBody.data_in) {
      processedBody.data_in = {}
    }
    
    for (const [key, value] of Object.entries(body)) {
      const fieldConfig = (collectionConfig as any)[key]
      
      // Skip data_in field - it will be processed separately
      if (key === 'data_in') {
        continue
      }
      
      // Handle virtual fields with data_in. prefix
      if (key.startsWith('data_in.')) {
        const dataInKey = key.replace('data_in.', '')
        if (!processedBody.data_in) {
          processedBody.data_in = {}
        }
        processedBody.data_in[dataInKey] = value
        // Execute beforeSave hook for virtual field if exists
        if (fieldConfig?.options?.hooks?.beforeSave) {
          fieldConfig.options.hooks.beforeSave(value, processedBody, context)
        }
        continue
      }
      
      // Skip virtual fields (they don't exist in DB)
      if (fieldConfig?.options?.virtual) {
        // Execute beforeChange hook if exists
        if (fieldConfig.options.hooks?.beforeChange) {
          fieldConfig.options.hooks.beforeChange(value, body)
        }
        continue
      }
      
      // Execute beforeChange hook for non-virtual fields
      if (fieldConfig?.options?.hooks?.beforeChange) {
        processedBody[key] = fieldConfig.options.hooks.beforeChange(value, body)
      } else {
        processedBody[key] = value
      }
    }
    
    // Process data_in fields and execute beforeSave hooks for virtual fields
    // Note: processedBody.data_in was already initialized from body.data_in above
    // Now we process each field and execute hooks
    if (body.data_in && typeof body.data_in === 'object') {
      // Ensure processedBody.data_in exists
      if (!processedBody.data_in) {
        processedBody.data_in = {}
      }
      
      for (const [dataInKey, dataInValue] of Object.entries(body.data_in)) {
        const virtualFieldName = `data_in.${dataInKey}`
        const fieldConfig = (collectionConfig as any)[virtualFieldName]
        
        console.log(`[handlePost ${collection}] Processing data_in field: ${dataInKey}`, {
          value: dataInValue,
          valueType: typeof dataInValue,
          hasFieldConfig: !!fieldConfig,
          hasBeforeSaveHook: !!fieldConfig?.options?.hooks?.beforeSave
        })
        
        // Execute beforeSave hook for virtual field if exists
        if (fieldConfig?.options?.hooks?.beforeSave) {
          // Hook may modify processedBody.data_in directly
          fieldConfig.options.hooks.beforeSave(dataInValue, processedBody, context)
          // If hook didn't set the value, set it explicitly
          if (!processedBody.data_in[dataInKey]) {
            processedBody.data_in[dataInKey] = dataInValue
          }
        } else {
          // If no hook, just assign the value
          processedBody.data_in[dataInKey] = dataInValue
        }
      }
      
      console.log(`[handlePost ${collection}] processedBody.data_in after processing:`, JSON.stringify(processedBody.data_in, null, 2))
    }
    
    console.log(`[handlePost ${collection}] Processed body before DB insert:`, JSON.stringify(processedBody, null, 2))
    
    // Parse JSON fields in processedBody to objects for beforeSave hooks (especially virtual fields)
    for (const key in processedBody) {
      const fieldConfig = (collectionConfig as any)[key]
      if (fieldConfig?.options?.type === 'json' && processedBody[key] != null) {
        const value = processedBody[key]
        if (typeof value === 'string') {
          try {
            processedBody[key] = JSON.parse(value)
          } catch {
            // Not valid JSON, keep as is
          }
        }
      }
    }
    
    // Execute beforeSave hooks for all fields (including virtual ones that modify other fields)
    for (const key in collectionConfig) {
      const fieldConfig = (collectionConfig as any)[key]
      if (fieldConfig?.options?.hooks?.beforeSave) {
        // Check both direct key and data_in.* prefix
        const fieldValue = body[key] !== undefined ? body[key] : body[`data_in.${key.replace('data_in.', '')}`]
        if (fieldValue !== undefined) {
          const result = fieldConfig.options.hooks.beforeSave(fieldValue, processedBody, context)
          // If beforeSave returns a value, it should modify the instance
          // Virtual fields can modify other fields in processedBody
          if (result !== undefined && !fieldConfig?.options?.virtual) {
            processedBody[key] = result
          }
        }
      }
    }
    
    // For goals collection, automatically add owner and required fields if not present
    if (collection === 'goals') {
      if (context.user?.humanAid && processedBody.data_in && !processedBody.data_in.owner) {
        processedBody.data_in.owner = context.user.humanAid
      }
      // Add required fields if not present
      if (!processedBody.cycle) {
        processedBody.cycle = 'ONCE'
      }
      if (!processedBody.order) {
        processedBody.order = '0'
      }
      if (processedBody.is_public === undefined || processedBody.is_public === null) {
        processedBody.is_public = 1
      }
      if (!processedBody.status_name) {
        processedBody.status_name = 'draft'
      }
      if (!processedBody.type) {
        processedBody.type = 'TESTING_CAMPAIGN'
      }
    }

    const db = createDb()
    const client = getPostgresClient(db)
    
    // Get table schema to detect auto-generated fields
    const pragmaResult = await executeRawQuery<{
      column_name: string;
      data_type: string;
      ordinal_position: number;
    }>(
      client,
      `SELECT column_name, data_type, ordinal_position
       FROM information_schema.columns
       WHERE table_name = $1
       ORDER BY ordinal_position`,
      [collection]
    )
    
    // Get primary key from information_schema
    const pkResult = await executeRawQuery<{ column_name: string }>(
      client,
      `SELECT column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_name = $1
       LIMIT 1`,
      [collection]
    )

    const pkColumn = pkResult[0]?.column_name || 'id'
    const columns = pragmaResult || []
    data = { ...processedBody }
    
    // Stringify JSON fields based on collection config
    for (const col of columns) {
      const fieldConfig = (collectionConfig as any)[col.column_name]
      const isJsonField = fieldConfig?.options?.type === 'json'
      
      console.log(`[handlePost ${collection}] Processing column ${col.column_name}:`, {
        dbType: col.data_type,
        configType: fieldConfig?.options?.type,
        isJsonField,
        valueType: typeof data[col.column_name],
        isObject: typeof data[col.column_name] === 'object' && data[col.column_name] !== null,
        value: col.column_name === 'data_in' ? JSON.stringify(data[col.column_name]).substring(0, 100) : data[col.column_name]
      })
      
      // Handle JSON/JSONB fields
      if (data[col.column_name] != null && typeof data[col.column_name] === 'object') {
        const isJsonb = col.data_type === 'jsonb' || col.data_type === 'JSONB' || col.data_type?.toLowerCase() === 'jsonb'
        const isJson = col.data_type === 'json' || col.data_type === 'JSON' || col.data_type?.toLowerCase() === 'json'
        const isTextJson = col.data_type === 'text' && isJsonField
        
        console.log(`[handlePost ${collection}] Column ${col.column_name} type check:`, {
          dbType: col.data_type,
          isJsonb,
          isJson,
          isTextJson,
          isJsonField,
          valueType: typeof data[col.column_name]
        })
        
        if (isJsonb) {
          // For JSONB columns in PostgreSQL, we need to stringify the object
          // The driver will handle the conversion to jsonb type
          const stringified = JSON.stringify(data[col.column_name])
          console.log(`[handlePost ${collection}] Stringifying ${col.column_name} (JSONB column):`, stringified.substring(0, 200))
          data[col.column_name] = stringified
        } else if (isJson || isTextJson) {
          // For JSON/TEXT columns, stringify
          const stringified = JSON.stringify(data[col.column_name])
          console.log(`[handlePost ${collection}] Stringifying ${col.column_name} (${col.data_type} column):`, stringified.substring(0, 200))
          data[col.column_name] = stringified
        } else if (col.data_type === 'text') {
          // Fallback: stringify object fields in TEXT columns (for backward compatibility)
          const stringified = JSON.stringify(data[col.column_name])
          console.log(`[handlePost ${collection}] Stringifying ${col.column_name} (TEXT column fallback):`, stringified.substring(0, 200))
          data[col.column_name] = stringified
        }
      }
    }

    // Auto-generate id, uuid, {x}aid if they exist in schema and not provided
    for (const col of columns) {
      const lowerName = col.column_name.toLowerCase()
      if (!data[col.column_name]) {
        if (lowerName === 'id' && col.column_name === pkColumn) {
          // Skip primary key id, let DB auto-increment
          continue
        }
        if (lowerName === 'uuid') {
          data[col.column_name] = generateUUID()
        } else if (lowerName.endsWith('aid')) {
          // Generate AID for columns like raid, haid, uaid, aid, gaid
          // Extract prefix: raid -> 'r', haid -> 'h', gaid -> 'g', aid -> 'a'
          const prefix = lowerName.length === 4 ? lowerName[0] : 'a'
          data[col.column_name] = generateAid(prefix)
        } else if (lowerName === 'created_at' || lowerName === 'updated_at') {
          data[col.column_name] = new Date().toISOString()
        } else if (lowerName === 'deleted_at') {
          // Leave deleted_at as NULL for new records
          data[col.column_name] = null
        }
      }
    }
    
    // Special handling for goals collection: generate full_gaid if gaid exists but full_gaid doesn't
    if (collection === 'goals') {
      if (data.gaid && !data.full_gaid) {
        data.full_gaid = data.gaid
      }
    }

    keys = Object.keys(data)
    values = keys.map((k) => data[k])
    
    // Build SQL with parameterized query
    // For jsonb columns, we need to cast the parameter: $1::jsonb
    // Use the columns we already fetched above
    const placeholders = keys.map((k, i) => {
      const col = pragmaResult?.find(c => c.column_name === k)
      if (col && (col.data_type === 'jsonb' || col.data_type?.toLowerCase() === 'jsonb')) {
        return `$${i + 1}::jsonb`
      }
      return `$${i + 1}`
    }).join(', ')
    
    sql = `INSERT INTO ${q(collection)} (${keys.map(q).join(', ')}) VALUES (${placeholders}) RETURNING id`

    console.log(`[handlePost ${collection}] SQL:`, sql)
    console.log(`[handlePost ${collection}] Values:`, values.map((v, i) => `${keys[i]}=${JSON.stringify(v)}`).join(', '))
    
    try {
      const result = await executeRawQuery<{ id: number }>(client, sql, values)
      console.log(`[handlePost ${collection}] Insert successful, ID:`, result[0]?.id)
      const lastRowId = result[0]?.id

      // Auto-assign order = id * 100 for contractors collection if order is empty/null/0
      if (collection === 'contractors' && lastRowId && (!data.order || data.order === 0)) {
        const updateSql = `UPDATE ${q(collection)} SET "order" = $1 WHERE id = $2`
        await executeRawQuery(client, updateSql, [lastRowId * 100, lastRowId])
        data.order = lastRowId * 100
      }

      // Auto-assign sort_order = id * 100 for taxonomy collection if sort_order is empty/null/0
      if (collection === 'taxonomy' && lastRowId) {
        const sortOrderValue = data.sort_order
        const needsAutoOrder = sortOrderValue === null || sortOrderValue === undefined || sortOrderValue === 0 || sortOrderValue === ''
        
        if (needsAutoOrder) {
          const autoSortOrder = lastRowId * 100
          await executeRawQuery(
            client,
            `UPDATE ${q(collection)} SET sort_order = $1 WHERE id = $2`,
            [autoSortOrder, lastRowId]
          )
          // Update data object for response
          data.sort_order = autoSortOrder
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        lastRowId: lastRowId || null,
        generated: Object.keys(data).filter(k => !body || !body[k]),
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (dbError) {
      console.error(`[handlePost ${collection}] Database error:`, dbError)
      const dbErrorMessage = dbError instanceof Error ? dbError.message : String(dbError)
      const dbErrorStack = dbError instanceof Error ? dbError.stack : undefined
      const dbErrorName = dbError instanceof Error ? dbError.name : 'UnknownError'
      console.error(`[handlePost ${collection}] Database error details:`, {
        name: dbErrorName,
        message: dbErrorMessage,
        stack: dbErrorStack,
        sql,
        values: values.map((v, i) => `${keys[i]}=${JSON.stringify(v)}`).join(', '),
        dataKeys: Object.keys(data),
        dataSample: Object.keys(data).reduce((acc, k) => {
          acc[k] = typeof data[k] === 'object' ? '[object]' : String(data[k]).substring(0, 50)
          return acc
        }, {} as Record<string, string>)
      })
      // Re-throw with more context
      const enhancedError = new Error(`Database error: ${dbErrorMessage}`)
      ;(enhancedError as any).originalError = dbError
      ;(enhancedError as any).sql = sql
      ;(enhancedError as any).values = values
      throw enhancedError
    }
  } catch (error) {
    console.error(`[handlePost ${collection}] Error:`, error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    const originalError = (error as any).originalError
    const originalMessage = originalError instanceof Error ? originalError.message : undefined
    
    // body might not be defined if error occurred before request.json()
    let bodyKeys: string[] = []
    try {
      bodyKeys = body ? Object.keys(body) : []
    } catch {
      bodyKeys = []
    }
    
    console.error(`[handlePost ${collection}] Full error details:`, {
      name: errorName,
      message: errorMessage,
      originalMessage,
      stack: errorStack,
      collection,
      bodyKeys,
      processedBodyKeys: Object.keys(processedBody || {}),
      sql: (error as any).sql,
    })
    
    // Return detailed error response
    const errorResponse: any = {
      error: 'Insert failed',
      message: errorMessage,
      details: originalMessage || errorMessage,
      collection,
    }
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = errorStack
      errorResponse.sql = (error as any).sql
      errorResponse.values = (error as any).values?.map((v: any, i: number) => 
        `${keys[i]}=${typeof v === 'object' ? JSON.stringify(v).substring(0, 100) : String(v).substring(0, 50)}`
      )
    }
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const GET = withAdminGuard(handleGet)
export const POST = withAdminGuard(handlePost)

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })

export async function OPTIONS() {
  return onRequestOptions()
}
