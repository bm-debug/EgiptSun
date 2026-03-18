/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withStorekeeperGuard } from '@/shared/api-guard'
import { BaseMovesRepository } from '@/shared/repositories/base-moves.repository'
import { MeRepository } from '@/shared/repositories/me.repository'

/**
 * GET /api/store/v2/s/my-receiving
 * Returns receiving base moves for current employee's location
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { request, env, user: sessionUserWithRoles } = context

  try {
    const url = new URL(request.url)
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10) || 1, 1)
    const limit = Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1)

    // Get user with employee info
    const meRepository = MeRepository.getInstance()
    const userWithRoles = await meRepository.findByIdWithRoles(Number(sessionUserWithRoles.user.id), {
      includeEmployee: true,
    })

    if (!userWithRoles?.employee) {
      return new Response(
        JSON.stringify({ 
          error: 'Информация о сотруднике не найдена. Обратитесь к администраторам системы.' 
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse employee data_in to get location_laid
    let employeeDataIn: any = {}
    if (userWithRoles.employee.dataIn) {
      try {
        employeeDataIn = typeof userWithRoles.employee.dataIn === 'string' 
          ? JSON.parse(userWithRoles.employee.dataIn) 
          : userWithRoles.employee.dataIn
      } catch (e) {
        console.error('Failed to parse employee dataIn:', e)
      }
    }

    const locationLaid = employeeDataIn?.location_laid
    if (!locationLaid) {
      return new Response(
        JSON.stringify({ 
          error: 'Локация сотрудника не настроена. Обратитесь к администраторам системы.' 
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Use repository to fetch data filtered by location and type
    const repository = BaseMovesRepository.getInstance()
    const result = await repository.findByLocation({
      laidTo: locationLaid,
      page,
      limit,
      type: 'RECEIVING',
    })

    // Parse dataIn JSON for each document
    const parsedDocs = result.docs.map((doc) => {
      let dataIn = null
      dataIn = doc.dataIn as Record<string, unknown> | null

      return {
        id: doc.id,
        uuid: doc.uuid,
        fullBaid: doc.fullBaid,
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
    console.error('Get my receiving error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось получить список машин. Обратитесь к администраторам системы.',
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


