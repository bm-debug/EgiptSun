/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { eq, asc } from 'drizzle-orm'
import { schema } from '@/shared/schema'
import { createDb } from '@/shared/repositories/utils'

/**
 * GET /api/store/v2/m/inventory-statuses
 * Returns inventory statuses from taxonomy (entity: relations.MOVE_ITEM)
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { env } = context

  try {
    const db = createDb(env.DB)
    
    // Fetch statuses from taxonomy
    const statuses = await db
      .select({
        name: schema.taxonomy.name,
        title: schema.taxonomy.title,
        sortOrder: schema.taxonomy.sortOrder,
      })
      .from(schema.taxonomy)
      .where(eq(schema.taxonomy.entity, 'relations.MOVE_ITEM'))
      .orderBy(asc(schema.taxonomy.sortOrder))
      .execute()

    // Format for select/options
    const options = statuses.map((status) => ({
      value: status.name || '',
      label: status.title || status.name || '',
      sortOrder: status.sortOrder,
    }))

    return new Response(
      JSON.stringify({
        success: true,
        data: options,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get inventory statuses error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось получить список статусов',
        details: String(error) 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const GET = withManagerGuard(handleGet)

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

