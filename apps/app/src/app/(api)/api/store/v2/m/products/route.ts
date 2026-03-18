/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { ProductsRepository } from '@/shared/repositories/products.repository'
import { RelationsRepository } from '@/shared/repositories/relations.repository'
import { BaseMovesRepository } from '@/shared/repositories/base-moves.repository'
import { sql } from 'drizzle-orm'
import { SiteDbPostgres } from '@/shared/repositories/utils'

/**
 * GET /api/store/v2/m/products
 * Returns paginated list of products with filters
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { request, env } = context

  try {
    const url = new URL(request.url)
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10) || 1, 1)
    const limit = Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1)
    const withInventory = url.searchParams.get('withInventory') === 'true'
    const fullBaid = url.searchParams.get('fullBaid')
    
    // New filters
    const category = url.searchParams.get('category') || undefined
    const statusName = url.searchParams.get('statusName') || undefined
    const warehouseLaid = url.searchParams.get('data_in.warehouse_laid') || undefined
    const search = url.searchParams.get('search') || undefined
    
    // Support multiple locations via location[]=value1&location[]=value2
    const locationParams = url.searchParams.getAll('location[]')
    const singleLocation = url.searchParams.get('location')
    let locationFilters: string[] = []
    
    if (locationParams.length > 0) {
      locationFilters = locationParams
    } else if (singleLocation) {
      locationFilters = singleLocation.split(',').map(l => l.trim()).filter(Boolean)
    }

    let locationLaid: string | null | undefined = undefined

    // Priority 1: If fullBaid is provided, get location from base_move
    if (fullBaid) {
      const baseMovesRepo = BaseMovesRepository.getInstance()
      const baseMove = await baseMovesRepo.findByFullBaid(fullBaid)
      
      if (!baseMove) {
        return new Response(
          JSON.stringify({ 
            error: 'Машина с указанным full_baid не найдена' 
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      locationLaid = baseMove.laidTo || baseMove.laidFrom
      
      if (!locationLaid) {
        return new Response(
          JSON.stringify({ 
            error: 'У машины не указана локация (laidTo или laidFrom)' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }
    // Priority 2: If location filters are provided, use them
    else if (locationFilters.length === 1) {
      // Single location from filter
      locationLaid = locationFilters[0]
    }

    // Use repository to fetch data with filters
    const repository = ProductsRepository.getInstance()
    
    // Check if we have any filters (new filters or location filters)
    const hasFilters = category || statusName || warehouseLaid || search || locationLaid || locationFilters.length > 0
    
    let result
    if (hasFilters) {
      // Determine warehouse location for filter
      let finalWarehouseLaid = warehouseLaid
      
      // Override with locationLaid from fullBaid if present
      if (locationLaid) {
        finalWarehouseLaid = locationLaid
      }
      // Override with single location from filters if present
      else if (locationFilters.length === 1) {
        finalWarehouseLaid = locationFilters[0]
      }
      // Multiple locations - we'll handle this separately
      else if (locationFilters.length > 1) {
        // Fetch all products with filters first, then filter by locations
        const allFilteredProducts = new Map<number, any>()
        
        for (const location of locationFilters) {
          const locationResult = await repository.findPaginatedWithFilters({ 
            page: 1, 
            limit: 10000, 
            category,
            statusName,
            warehouseLaid: location,
            search,
          })
          
          // Add products to map (use map to avoid duplicates)
          locationResult.docs.forEach(product => {
            if (!allFilteredProducts.has(product.id)) {
              allFilteredProducts.set(product.id, product)
            }
          })
        }
        
        // Convert map to array
        const mergedDocs = Array.from(allFilteredProducts.values())
        const totalDocs = mergedDocs.length
        const totalPages = Math.ceil(totalDocs / limit)
        
        // Apply pagination manually
        const offset = (page - 1) * limit
        const paginatedDocs = mergedDocs.slice(offset, offset + limit)
        
        result = {
          docs: paginatedDocs,
          totalDocs,
          limit,
          totalPages,
          page,
        }
      }
      
      // Use new filter method if we haven't handled multiple locations
      if (!result) {
        result = await repository.findPaginatedWithFilters({ 
          page, 
          limit, 
          category,
          statusName,
          warehouseLaid: finalWarehouseLaid,
          search,
        })
      }
    } else {
      // No filters - get all products
      result = await repository.findPaginated({ page, limit })
    }

    // Get inventory aggregation if requested
    let inventoryMap = new Map<string, {
      available: number;
      in_transporting: number;
      unavailable: number;
      commited: number;
    }>();
    
    if (withInventory) {
      const productPaids = result.docs
        .map(doc => (typeof doc.paid === 'string' ? doc.paid : null))
        .filter((paid): paid is string => Boolean(paid))
      const relationsRepo = RelationsRepository.getInstance()
      inventoryMap = await relationsRepo.getInventoryAggregationByProducts(productPaids)
    }

    // Parse dataIn JSON for each document and merge inventory stats if requested
    const docs = result.docs.map((rawDoc) => {
      const doc: Record<string, any> = { ...rawDoc }

      // Ensure dataIn is parsed to object (repo may already do this, but keep safe fallback)
      const rawDataIn = doc.dataIn ?? doc['data_in']
      if (typeof rawDataIn === 'string') {
        try {
          let parsed = JSON.parse(rawDataIn)
          // Handle double-encoded JSON strings (when JSON is stored as escaped string)
          if (typeof parsed === 'string' && (parsed.startsWith('{') || parsed.startsWith('['))) {
            try {
              parsed = JSON.parse(parsed)
            } catch {
              // If second parse fails, use first parse result
            }
          }
          doc.dataIn = parsed
          doc['data_in'] = parsed
        } catch (error) {
          console.warn('Failed to parse dataIn for product', { paid: doc.paid, error })
        }
      }

      if (withInventory) {
        const paid = typeof doc.paid === 'string' ? doc.paid : null
        const inventoryStats = paid ? inventoryMap.get(paid) : undefined
        const defaultInventory = {
          available: 0,
          in_transporting: 0,
          unavailable: 0,
          commited: 0,
        }
        doc.inventory = inventoryStats ? { ...defaultInventory, ...inventoryStats } : defaultInventory
      }

      return doc
    })

    const offset = (page - 1) * limit

    return new Response(
      JSON.stringify({
        docs,
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

/**
 * POST /api/store/v2/m/products
 * Creates a new product
 */
async function handlePost(context: AuthenticatedRequestContext) {
  const { request, env } = context

  try {
    // Parse request body
    const body = await request.json() as {
      title: string
      category: string
      statusName: string
      data_in?: {
        warehouse_laid?: string
        price?: number
        reduced_limit?: number
      }
    }

    // Validate required fields
    if (!body.title || !body.category || !body.statusName) {
      return new Response(
        JSON.stringify({ 
          error: 'Поля title, category и statusName обязательны' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Generate UUID and paid
    const uuid = crypto.randomUUID()
    const paid = `p-${uuid.substring(0, 8)}`

    // Prepare data_in
    const dataIn = JSON.stringify(body.data_in || {})

    // Create product
    // const repository = ProductsRepository.getInstance() // Unused
    await (env.DB as SiteDbPostgres).execute(sql`
      INSERT INTO products (uuid, paid, title, category, status_name, data_in, created_at, updated_at)
      VALUES (
        ${uuid},
        ${paid},
        ${body.title},
        ${body.category},
        ${body.statusName},
        ${dataIn},
        NOW(),
        NOW()
      )
    `)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Товар успешно создан',
        data: {
          uuid,
          paid,
        },
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Create product error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось создать товар',
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
export const POST = withManagerGuard(handlePost)

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}
