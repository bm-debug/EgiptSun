import { AuthenticatedRequestContext, withSuperAdminGuard } from '@/shared/api-guard'
import { ALLOWED_ADMIN_COLLECTIONS } from '@/shared/collections'
import { getCollection } from '@/shared/collections/getCollection'
import { getRepository } from '@/shared/repositories/getRepository'

import type { DbFilters, DbOrder, DbOrders, DbPaginatedResult, DbResult } from '@/shared/types/shared'
import qs from 'qs'

const jsonHeaders = { 'content-type': 'application/json' } as const

async function handleGet(context: AuthenticatedRequestContext): Promise<Response> {
  const { request, params } = context
  const collection = params?.collection as string

  if (!collection || !ALLOWED_ADMIN_COLLECTIONS.has(collection)) {
    return new Response(JSON.stringify({ error: 'Invalid collection' }), {
      status: 400,
      headers: jsonHeaders,
    })
  }

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('p') || url.searchParams.get('page') || 1))
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('ps') || url.searchParams.get('limit') || 20)))

  const queryObject= qs.parse(url.search.replace('?', '')) as unknown as {
    filters?: DbFilters
    orders?: DbOrders
  }
  const filtersParam = queryObject.filters || {} as DbFilters
  const ordersParam:DbOrders =queryObject.orders|| {} as DbOrders

  try {
    const repo = getRepository(collection)
    const hasDeletedAt = 'deletedAt' in repo.schema

    const baseConditions = hasDeletedAt
      ? [{ field: 'deletedAt', operator: 'isNull' as const, values: [] as (string | number | boolean | null)[] }]
      : []
    const filters: DbFilters = {
      conditions: [...baseConditions, ...(filtersParam.conditions ?? [])],
    }


    const pagination = { page, limit }

    const { docs: rows, pagination: pag } = await repo.getFiltered(filters, ordersParam, pagination)
    const total = pag.total
    const collectionConfig = getCollection(collection)

    const processedData = (rows || []).map((row: any) => {
      const processed = { ...row }
      for (const key of Object.keys(processed)) {
        const fieldConfig = (collectionConfig as any)[key]
        if (fieldConfig?.options?.type === 'json' && processed[key] != null) {
          try {
            const v = processed[key]
            if (typeof v === 'string') processed[key] = JSON.parse(v)
          } catch {
            // keep as is
          }
        }
      }
      return processed
    })

    const body: DbPaginatedResult<unknown> = {
      docs: processedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: jsonHeaders,
    })
  } catch (error) {
    console.error('REST schema GET error:', error)
    return new Response(
      JSON.stringify({ error: 'Query failed', details: String(error) }),
      { status: 500, headers: jsonHeaders }
    )
  }
}

async function handlePost(context: AuthenticatedRequestContext): Promise<Response> {
  const { params, request } = context
  const collection = params?.collection as string

  if (!collection || !ALLOWED_ADMIN_COLLECTIONS.has(collection)) {
    return new Response(JSON.stringify({ error: 'Invalid collection' }), {
      status: 400,
      headers: jsonHeaders,
    })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const repo = getRepository(collection)
    const entity = await repo.create(body)

    const responseBody: DbResult<unknown> = { success: true, doc: entity }
    return new Response(JSON.stringify(responseBody), {
      status: 201,
      headers: jsonHeaders,
    })
  } catch (error) {
    console.error('REST schema POST error:', error)
    return new Response(
      JSON.stringify({ error: 'Create failed', details: String(error) }),
      { status: 500, headers: jsonHeaders }
    )
  }
}

export const GET = withSuperAdminGuard(handleGet)
export const POST = withSuperAdminGuard(handlePost)
