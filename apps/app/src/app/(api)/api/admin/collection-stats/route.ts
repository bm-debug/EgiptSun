/// <reference types="@cloudflare/workers-types" />

import { withAdminGuard } from '@/shared/api-guard'
import { AuthenticatedContext, CollectionStats } from '@/shared/types'
import { getPostgresClient, executeRawQuery, createDb } from '@/shared/repositories/utils'

/**
 * GET /api/admin/collection-stats?name=users
 * Returns statistics for a specific collection
 */
async function handleGet(context: AuthenticatedContext): Promise<Response> {
  const { request } = context

  try {
    const url = new URL(request.url)
    const collectionName = url.searchParams.get('name')

    if (!collectionName) {
      return new Response(
        JSON.stringify({ error: 'Collection name is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const db = createDb()
    const client = getPostgresClient(db)
    
    // Validate table exists
    const tableExistsResult = await executeRawQuery<{ table_name: string }>(
      client,
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = $1`,
      [collectionName]
    )

    if (!tableExistsResult || tableExistsResult.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Collection not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Get total count
    const totalResult = await executeRawQuery<{ count: string | number }>(
      client,
      `SELECT COUNT(*) as count FROM "${collectionName}"`
    )

    const total = Number(totalResult[0]?.count) || 0

    // Check if table has deleted_at column
    const columnsResult = await executeRawQuery<{ column_name: string; data_type: string }>(
      client,
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = $1`,
      [collectionName]
    )

    const hasDeletedAt = columnsResult?.some((col: { column_name: string }) => col.column_name === 'deleted_at')
    const hasUuid = columnsResult?.some((col: { column_name: string }) => col.column_name === 'uuid')

    let activeCount = total
    let deletedCount = 0

    if (hasDeletedAt) {
      const activeResult = await executeRawQuery<{ count: string | number }>(
        client,
        `SELECT COUNT(*) as count FROM "${collectionName}" WHERE deleted_at IS NULL`
      )

      activeCount = Number(activeResult[0]?.count) || 0
      deletedCount = total - activeCount
    }

    const stats: CollectionStats = {
      name: collectionName,
      count: activeCount,
      hasDeleted: hasDeletedAt,
      hasUuid,
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        total,
        active: activeCount,
        deleted: deletedCount,
        columns: columnsResult?.length || 0,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get collection stats error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch collection stats', 
        details: String(error) 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const GET = withAdminGuard(handleGet)

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

