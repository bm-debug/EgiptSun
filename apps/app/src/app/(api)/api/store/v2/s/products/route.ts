/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withStorekeeperGuard } from '@/shared/api-guard'
import { ProductsRepository } from '@/shared/repositories/products.repository'
import { MeRepository } from '@/shared/repositories/me.repository'
import { RelationsRepository } from '@/shared/repositories/relations.repository'

/**
 * GET /api/store/v2/s/products
 * Returns paginated list of products filtered by current employee's location
 * Query params:
 *   - page: page number (default: 1)
 *   - limit: items per page (default: 20)
 *   - withInventory: include inventory aggregation (default: false)
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { request, env, user: sessionUserWithRoles } = context

  try {
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

    const url = new URL(request.url)
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10) || 1, 1)
    const limit = Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1)
    const withInventory = url.searchParams.get('withInventory') === 'true'

    // Use repository to fetch data filtered by location
    const repository = ProductsRepository.getInstance()
    const result = await repository.findPaginatedByLocation({ page, limit, locationLaid })

    // Get inventory aggregation if requested
    let inventoryMap = new Map<string, {
      available: number;
      in_transporting: number;
      unavailable: number;
      commited: number;
    }>();
    
    if (withInventory) {
      const productPaids = result.docs.map(doc => doc.paid).filter(Boolean) as string[]
      const relationsRepo = RelationsRepository.getInstance()
      inventoryMap = await relationsRepo.getInventoryAggregationByProducts(productPaids)
    }

    // Parse dataIn JSON for each document
    const parsedDocs = result.docs.map((doc) => {
      let dataIn = null
      dataIn = doc.dataIn as Record<string, unknown> | null

      const baseDoc = {
        id: doc.id,
        uuid: doc.uuid,
        paid: doc.paid,
        title: doc.title,
        category: doc.category,
        type: doc.type,
        statusName: doc.statusName,
        isPublic: doc.isPublic,
        dataIn,
      }

      // Add inventory stats if requested
      if (withInventory && doc.paid) {
        const inventory = inventoryMap.get(doc.paid) || {
          available: 0,
          in_transporting: 0,
          unavailable: 0,
          commited: 0,
        }
        return {
          ...baseDoc,
          inventory,
        }
      }

      return baseDoc
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
    console.error('Get products error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch products', details: String(error) }),
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


