/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withStorekeeperGuard } from '@/shared/api-guard'
import { WalletsRepository } from '@/shared/repositories/wallets.repository'

/**
 * GET /api/store/v2/s/wallets
 * Returns paginated list of wallets for staff view
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { request, env } = context

  try {
    const url = new URL(request.url)
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10) || 1, 1)
    const limit = Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1)

    // Use repository to fetch data
    const repository = WalletsRepository.getInstance()
    const result = await repository.findPaginated({ page, limit })

    // Parse dataIn JSON for each document
    const parsedDocs = await Promise.all(result.docs.map(async (doc) => {
      let dataIn: Record<string, unknown> | null = doc.dataIn as Record<string, unknown> | null
    

      const balance = doc.waid ? await repository.getBalance(doc.waid) : 0
      const normalizedBalance = Number.isFinite(balance) ? Number(balance.toFixed(2)) : 0

      if (dataIn) {
        dataIn = { ...dataIn, balance: normalizedBalance }
      } else {
        dataIn = { balance: normalizedBalance }
      }

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
        title: parsedTitle,
        targetAid: doc.targetAid,
        waid: doc.waid,
        dataIn,
      }
    }))

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
    console.error('Get wallets error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch wallets', details: String(error) }),
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


