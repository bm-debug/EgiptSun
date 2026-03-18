/// <reference types="@cloudflare/workers-types" />

import { JournalsRepository } from '@/shared/repositories/journals.repository'
import type { DbFilters, DbOrders, DbPagination } from '@/shared/types/shared'
import { buildRequestEnv } from '@/shared/env'
import type { RequestContext } from '@/shared/types'
import { parseJournals } from '@/shared/utils/http'
import { withAdminGuard } from '@/shared/api-guard'
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
} as const

const jsonHeaders = {
  ...corsHeaders,
  'content-type': 'application/json',
} as const

const parseQueryParams = (url: URL): { filters: DbFilters; orders: DbOrders; pagination: DbPagination } => {
  const filters: DbFilters = { conditions: [] }
  const orders: DbOrders = { orders: [] }
  const pagination: DbPagination = {}

  // Parse pagination
  const page = url.searchParams.get('page')
  const limit = url.searchParams.get('limit')
  if (page) pagination.page = parseInt(page, 10)
  if (limit) pagination.limit = parseInt(limit, 10)

  // Parse filters (example: ?action=LOAN_APPLICATION_SNAPSHOT)
  const action = url.searchParams.get('action')
  if (action) {
    filters.conditions?.push({
      field: 'action',
      operator: 'eq',
      values: [action],
    })
  }

  // Parse orders (example: ?orderBy=createdAt&orderDirection=desc)
  const orderBy = url.searchParams.get('orderBy')
  const orderDirection = url.searchParams.get('orderDirection') as 'asc' | 'desc' | null
  if (orderBy && orderDirection) {
    orders.orders?.push({
      field: orderBy,
      direction: orderDirection,
    })
  } else {
    // Default order by createdAt desc
    orders.orders?.push({
      field: 'createdAt',
      direction: 'desc',
    })
  }

  return { filters, orders, pagination }
}

async function handleGet(context: RequestContext): Promise<Response> {
  const { request, env } = context

  try {
    const url = new URL(request.url)
    const { filters, orders, pagination } = parseQueryParams(url)

    const journalsRepository = JournalsRepository.getInstance()
    const result = await journalsRepository.getFiltered(filters, orders, pagination)
    result.docs = await parseJournals(result.docs)
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    )
  } catch (error) {
    console.error('Failed to fetch journals', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return new Response(
      JSON.stringify({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message,
      }),
      {
        status: 500,
        headers: jsonHeaders,
      },
    )
  }
}

export const GET = withAdminGuard(handleGet)

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

