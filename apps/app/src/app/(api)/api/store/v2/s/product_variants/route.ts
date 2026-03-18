/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withStorekeeperGuard } from '@/shared/api-guard'
import { ProductVariantsRepository } from '@/shared/repositories/product-variants.repository'
import { createDb, SiteDbPostgres } from '@/shared/repositories/utils'

/**
 * GET /api/store/v2/s/product_variants
 * Returns paginated list of product variants
 * Query params:
 *   - page: page number (default: 1)
 *   - limit: items per page (default: 20)
 *   - location_laid: filter by location (optional)
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { request, env } = context

  try {
    const url = new URL(request.url)
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10) || 1, 1)
    const limit = Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1)
    const locationLaid = url.searchParams.get('location_laid')

    // Use repository to fetch data
    const repository = ProductVariantsRepository.getInstance()
    
    // If location_laid is provided, filter by location using relations
    const result = locationLaid
      ? await repository.findPaginatedByLocation({ page, limit, locationLaid })
      : await repository.findPaginated({ page, limit })

    // Parse dataIn JSON for each document
    const parsedDocs = result.docs.map((doc) => {
      let dataIn = null
      dataIn = doc.dataIn as Record<string, unknown> | null

      // Parse title if it's a JSON string
      let parsedTitle = doc.title
      if (typeof doc.title === 'string' && doc.title.startsWith('{')) {
        try {
          parsedTitle = JSON.parse(doc.title)
        } catch {
          parsedTitle = doc.title
        }
      }

      return {
        id: doc.id,
        uuid: doc.uuid,
        pvaid: doc.pvaid,
        fullPaid: doc.fullPaid,
        sku: doc.sku,
        title: parsedTitle,
        statusName: doc.statusName,
        dataIn,
      }
    })

    const offset = (page - 1) * limit

    return new Response(
      JSON.stringify({
        docs: parsedDocs,
        totalDocs: result.totalDocs,
        limit: result.limit,
        totalPages: result.totalPages,
        page: result.page,
        pagingCounter: offset + 1,
        hasPrevPage: page > 1,
        hasNextPage: page < result.totalPages,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < result.totalPages ? page + 1 : null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get product variants error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch product variants', details: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const GET = withStorekeeperGuard(handleGet)

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


