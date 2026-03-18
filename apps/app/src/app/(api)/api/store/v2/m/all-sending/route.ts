/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { BaseMovesRepository } from '@/shared/repositories/base-moves.repository'
import { ContractorsRepository } from '@/shared/repositories/contractors.repository'

/**
 * GET /api/store/v2/m/all-sending
 * Returns all sending base moves with optional location filter (supports multiple locations)
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

    // Use repository to fetch sending base moves with optional location filter
    const repository = BaseMovesRepository.getInstance()
    
    // If multiple locations are selected, we need to fetch all and filter
    let result
    if (locationFilters.length === 0) {
      // No filter - get all
      result = await repository.findByLocation({
        page,
        limit,
        type: 'SENDING',
      })
    } else if (locationFilters.length === 1) {
      // Single location - use repository filter
      result = await repository.findByLocation({
        page,
        limit,
        type: 'SENDING',
        laidFrom: locationFilters[0],
      })
    } else {
      // Multiple locations - fetch all and filter in memory
      const allResult = await repository.findByLocation({
        page: 1,
        limit: 10000, // Large limit to get all
        type: 'SENDING',
      })
      
      // Filter by multiple locations
      const filteredDocs = allResult.docs.filter(doc => 
        doc.laidFrom && locationFilters.includes(doc.laidFrom)
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

    // Parse dataIn JSON for each document and enrich with contractor data and receiving info
    const contractorsRepo = ContractorsRepository.getInstance()
    const parsedDocs = await Promise.all(result.docs.map(async (doc) => {
      let dataIn = null
      dataIn = doc.dataIn as Record<string, unknown> | null

      // Fetch contractor details if contractor_caid is present
      let contractorTitle = null
      if (dataIn?.contractor_caid) {
        try {
          const contractor = await contractorsRepo.findByCaid(dataIn.contractor_caid as string)
          contractorTitle = contractor?.title || dataIn.contractor_caid
        } catch (e) {
          console.error('Failed to fetch contractor:', e)
          contractorTitle = dataIn.contractor_caid
        }
      }

      // Fetch related receiving data if this is a sending
      let receivingItemsCount = null
      let receivingSKUCount = null
      if (doc.fullBaid) {
        try {
          const receiving = await repository.findReceivingBySendingBaid(doc.fullBaid)
          if (receiving?.dataIn) {
            const receivingDataIn = receiving.dataIn as Record<string, unknown> | null
            receivingItemsCount = receivingDataIn?.items_count
            receivingSKUCount = receivingDataIn?.SKU_count
          }
        } catch (e) {
          console.error('Failed to fetch receiving data:', e)
        }
      }

      return {
        id: doc.id,
        uuid: doc.uuid,
        fullBaid: doc.fullBaid,
        number: doc.number,
        title: doc.title,
        laidTo: doc.laidTo,
        laidFrom: doc.laidFrom,
        statusName: doc.statusName,
        createdAt: doc.createdAt,
        dataIn: {
          ...dataIn,
          contractor: contractorTitle || dataIn?.contractor || dataIn?.client,
          receiving_items_count: receivingItemsCount,
          receiving_SKU_count: receivingSKUCount,
        },
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
    console.error('Get my sending error:', error)
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

