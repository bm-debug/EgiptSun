/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { BaseMovesRepository } from '@/shared/repositories/base-moves.repository'

/**
 * GET /api/store/v2/m/all-receiving
 * Returns all receiving base moves with optional location filter (supports multiple locations)
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { request, env } = context

  try {
    const url = new URL(request.url)
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10) || 1, 1)
    const limit = Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1)
    
    // Support multiple locations via location[]=value1&location[]=value2 or location=value1,value2
    const locationParams = url.searchParams.getAll('location[]')
    const singleLocation = url.searchParams.get('location')
    let locationFilters: string[] = []
    
    if (locationParams.length > 0) {
      locationFilters = locationParams
    } else if (singleLocation) {
      // Support comma-separated values
      locationFilters = singleLocation.split(',').map(l => l.trim()).filter(Boolean)
    }

    // Use repository to fetch receiving base moves with optional location filter
    const repository = BaseMovesRepository.getInstance()
    
    // If multiple locations are selected, we need to fetch all and filter
    let result
    if (locationFilters.length === 0) {
      // No filter - get all
      result = await repository.findByLocation({
        page,
        limit,
        type: 'RECEIVING',
      })
    } else if (locationFilters.length === 1) {
      // Single location - use repository filter
      result = await repository.findByLocation({
        page,
        limit,
        type: 'RECEIVING',
        laidTo: locationFilters[0],
      })
    } else {
      // Multiple locations - fetch all and filter in memory
      const allResult = await repository.findByLocation({
        page: 1,
        limit: 10000, // Large limit to get all
        type: 'RECEIVING',
      })
      
      // Filter by multiple locations
      const filteredDocs = allResult.docs.filter(doc => 
        doc.laidTo && locationFilters.includes(doc.laidTo)
      )
      
      // Manual pagination
      const totalDocs = filteredDocs.length
      const totalPages = Math.ceil(totalDocs / limit)
      const offset = (page - 1) * limit
      const paginatedDocs = filteredDocs.slice(offset, offset + limit)
      
      result = {
        docs: paginatedDocs,
        totalDocs,
        limit,
        totalPages,
        page,
        pagingCounter: offset + 1,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < totalPages ? page + 1 : null,
      }
    }

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

