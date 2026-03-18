/// <reference types="@cloudflare/workers-types" />

import { AuthenticatedContext } from '@/shared/types'
import { COLLECTION_GROUPS } from '@/shared/collections'
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

async function validatePasswordFields(collection: string, data: Record<string, any>, isUpdate: boolean = false): Promise<string | null> {
  const collectionConfig = getCollection(collection)
  
  for (const [fieldName, value] of Object.entries(data)) {
    const columnConfig = (collectionConfig as any)[fieldName]
    if (columnConfig?.options?.type === 'password') {
      // For updates: if password is empty, skip validation (user doesn't want to change it)
      if (isUpdate && (value == null || value === '')) {
        continue
      }
      
      // For creates or non-empty updates: validate
      if (value != null && value !== '') {
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
  }
  
  return null
}

async function hashPasswordFields(collection: string, data: Record<string, any>, isUpdate: boolean = false): Promise<void> {
  const collectionConfig = getCollection(collection)
  
  for (const [fieldName, value] of Object.entries(data)) {
    const columnConfig = (collectionConfig as any)[fieldName]
    if (columnConfig?.options?.type === 'password') {
      // For updates: if password is empty, remove it from data (don't update)
      if (isUpdate && (value == null || value === '')) {
        delete data[fieldName]
        delete data[`${fieldName}_confirm`]
        continue
      }
      
      // Hash the password if it's provided
      if (value != null && value !== '') {
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
}

async function handleDelete(context: AuthenticatedRequestContext): Promise<Response> {
  const { params } = context
  const collection = params?.collection as string
  const idParam = params?.id as string

  if (!collection || !idParam) {
    return new Response(JSON.stringify({ error: 'Missing collection or id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!isAllowedCollection(collection)) {
    return new Response(JSON.stringify({ error: 'Collection not allowed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const db = createDb()
    const client = getPostgresClient(db)
    
    // Detect primary key column and soft-delete capability
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
    
    const pk = pkResult[0]?.column_name || 'id'
    const hasDeletedAt = Boolean(pragmaResult?.some((c: { column_name: string }) => c.column_name.toLowerCase() === 'deleted_at'))

    if (hasDeletedAt) {
      const stmt = await executeRawQuery(
        client,
        `UPDATE ${q(collection)} SET ${q('deleted_at')} = $1 WHERE ${q(pk)} = $2`,
        [new Date().toISOString(), idParam]
      )
      return new Response(JSON.stringify({ success: true, changes: Array.isArray(stmt) ? stmt.length : 0, softDeleted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const stmt = await executeRawQuery(
      client,
      `DELETE FROM ${q(collection)} WHERE ${q(pk)} = $1`,
      [idParam]
    )

    return new Response(JSON.stringify({ success: true, changes: Array.isArray(stmt) ? stmt.length : 0, softDeleted: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Delete failed', details: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function handlePut(context: AuthenticatedRequestContext): Promise<Response> {
  const { params, request } = context
  const collection = params?.collection as string
  const idParam = params?.id as string

  if (!collection || !idParam) {
    return new Response(JSON.stringify({ error: 'Missing collection or id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!isAllowedCollection(collection)) {
    return new Response(JSON.stringify({ error: 'Collection not allowed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json() as Record<string, any>
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate email fields
    const emailError = validateEmailFields(collection, body)
    if (emailError) {
      return new Response(JSON.stringify({ error: emailError }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate password fields (for update mode)
    const passwordError = await validatePasswordFields(collection, body, true)
    if (passwordError) {
      return new Response(JSON.stringify({ error: passwordError }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Hash password fields (for update mode)
    await hashPasswordFields(collection, body, true)

    // Process hooks and virtual fields
    const collectionConfig = getCollection(collection)
    const processedBody: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(body)) {
      const fieldConfig = (collectionConfig as any)[key]
      
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
        const fieldValue = body[key]
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

    const db = createDb()
    const client = getPostgresClient(db)
    
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

    const columnsInfo = pragmaResult || []
    const columns = columnsInfo.map((c: { column_name: string }) => c.column_name)
    const pk = pkResult[0]?.column_name || 'id'
    const hasUpdatedAt = columns.some((n: string) => n.toLowerCase() === 'updated_at')

    // Build safe update set from provided body keys that exist in table and are not PK
    // Exclude updated_at from allowedKeys since it's always set automatically
    const allowedKeys = Object.keys(processedBody).filter((k) => 
      columns.includes(k) && 
      k !== pk && 
      k.toLowerCase() !== 'updated_at'
    )

    const assignments: string[] = []
    const values: any[] = []
    for (const key of allowedKeys) {
      assignments.push(`${q(key)} = $${values.length + 1}`)
      let value = processedBody[key]
      
      // Stringify JSON fields based on collection config
      const fieldConfig = (collectionConfig as any)[key]
      const isJsonField = fieldConfig?.options?.type === 'json'
      const colInfo = columnsInfo.find((c: { column_name: string }) => c.column_name === key)
      
      if (isJsonField && value != null && typeof value === 'object') {
        value = JSON.stringify(value)
      } else if (!isJsonField && value && typeof value === 'object' && colInfo?.data_type === 'text') {
        // Fallback: stringify object fields in TEXT columns (for backward compatibility)
        value = JSON.stringify(value)
      }
      
      values.push(value)
    }

    if (hasUpdatedAt) {
      assignments.push(`${q('updated_at')} = $${values.length + 1}`)
      values.push(new Date().toISOString())
    }

    if (assignments.length === 0) {
      return new Response(JSON.stringify({ error: 'No updatable fields provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Build SQL with parameterized query
    const updateSql = `UPDATE ${q(collection)} SET ${assignments.join(', ')} WHERE ${q(pk)} = $${values.length + 1}`
    values.push(idParam)
    
    // Execute query
    const result = await executeRawQuery(client, updateSql, values)

    // Handle role assignment for users collection
    if (collection === 'users' && body.roleUuids !== undefined && Array.isArray(body.roleUuids)) {
      const { UserRolesRepository } = await import('@/shared/repositories/user-roles.repository')
      const userRolesRepository = UserRolesRepository.getInstance()
      
      // Find user by primary key to get UUID
      const userResult = await executeRawQuery<{ uuid: string }>(
        client,
        `SELECT uuid FROM ${q(collection)} WHERE ${q(pk)} = $1 LIMIT 1`,
        [idParam]
      )
      
      if (userResult && userResult.length > 0 && userResult[0].uuid) {
        const userUuid = userResult[0].uuid
        
        // Remove all existing roles
        await userRolesRepository.removeAllRolesFromUser(userUuid)
        
        // Assign new roles
        if (body.roleUuids.length > 0) {
          await userRolesRepository.assignRolesToUser(userUuid, body.roleUuids)
        }
      }
    }

    return new Response(JSON.stringify({ success: true, changes: Array.isArray(result) ? result.length : 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Update failed', details: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const DELETE = withAdminGuard(handleDelete)
export const PUT = withAdminGuard(handlePut)

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })

export async function OPTIONS() {
  return onRequestOptions()
}
