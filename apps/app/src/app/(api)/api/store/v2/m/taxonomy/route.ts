
import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { TaxonomyRepository } from '@/shared/repositories/taxonomy.repository'
import qs from 'qs'
import { DbFilters } from '@/shared/types/shared'

/**
 * GET /api/store/v2/m/taxonomy
 * Returns paginated list of taxonomy entries filtered by entity
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { request, env } = context

  try {
    const url = new URL(request.url)
    const params = qs.parse(url.search.replace('?', ''))
    const filters = params.filters as DbFilters
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10) || 1, 1)
    const limit = Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1)
    const entity = url.searchParams.get('entity') || undefined

    // Use repository to fetch data
    const repository = TaxonomyRepository.getInstance()

    const result = await repository.findPaginated({ page, limit, entity, filters: filters as DbFilters })

    const offset = (page - 1) * limit

    return new Response(
      JSON.stringify({
        docs: result.docs,
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
    console.error('Get taxonomy error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch taxonomy', details: String(error) }),
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

