/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withStorekeeperGuard } from '@/shared/api-guard'
import { BaseMovesRepository } from '@/shared/repositories/base-moves.repository'

/**
 * GET /api/store/v2/s/base_moves
 * Returns paginated list of base moves
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { request, env } = context

  try {
    const url = new URL(request.url)
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10) || 1, 1)
    const limit = Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1)

    // Use repository to fetch data
    const repository = BaseMovesRepository.getInstance()
    const result = await repository.findPaginated({ page, limit })

    // Parse dataIn JSON for each document
    const parsedDocs = result.docs.map((doc) => {
      let dataIn = null
      dataIn = doc.dataIn as Record<string, unknown> | null
      return {
        id: doc.id,
        uuid: doc.uuid,
        number: doc.number,
        title: doc.title,
        laidTo: doc.laidTo,
        statusName: doc.statusName,
        createdAt: doc.createdAt,
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
    console.error('Get base moves error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось загрузить список входящих машин. Произошла внутренняя ошибка сервера. Пожалуйста, попробуйте обновить страницу или обратитесь к администраторам системы с сообщением об этой ошибке.',
        details: String(error) 
      }),
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


