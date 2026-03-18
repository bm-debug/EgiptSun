/// <reference types="@cloudflare/workers-types" />

import { getSession } from '@/shared/session'
import { Env } from '@/shared/types'
import { MeRepository } from '@/shared/repositories/me.repository'
import { DealsRepository } from '@/shared/repositories/deals.repository'
import type { DbFilters, DbOrders, DbPagination } from '@/shared/types/shared'
import { buildRequestEnv } from '@/shared/env'
import { withClientGuard } from '@/shared/api-guard'
import { LoanApplication } from '@/shared/types/altrp'

/**
 * GET /api/c/deals
 * Returns list of deals for consumer
 */
export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const { request, env } = context

  if (!env.AUTH_SECRET) {
    return new Response(JSON.stringify({ error: 'Authentication not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const sessionUser = await getSession(request, env.AUTH_SECRET)

  if (!sessionUser) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const meRepository = MeRepository.getInstance()
    const userWithRoles = await meRepository.findByIdWithRoles(Number(sessionUser.id))

    if (!userWithRoles) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { human } = userWithRoles
    
    if (!human?.haid) {
      return new Response(JSON.stringify({ error: 'Human profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(request.url)
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') || ''
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    
    const dealsRepository = DealsRepository.getInstance()
    
    // Build filters
    const filterConditions: DbFilters['conditions'] = [
      {
        field: 'clientAid',
        operator: 'eq',
        values: [human.haid],
      },
      {
        field: 'dataIn',
        operator: 'like',
        values: ['%"type":"LOAN_APPLICATION"%'],
      },
    ]

    if (status) {
      filterConditions.push({
        field: 'statusName',
        operator: 'eq',
        values: [status],
      })
    }

    const filters: DbFilters = {
      conditions: filterConditions,
    }

    const orders: DbOrders = {
      orders: [{ field: 'createdAt', direction: 'desc' }],
    }

    const pagination: DbPagination = { page, limit }

    // Get deals using repository
    // Use getDealsWithSearch if search query exists, otherwise use regular getDeals
    const result = search
      ? await dealsRepository.getDealsWithSearch({
          searchQuery: search,
          filters,
          orders,
          pagination,
        })
      : await dealsRepository.getDeals({
          filters,
          orders,
          pagination,
        })

    // Get all deals for this user to collect unique statuses (without pagination limit for status collection)
    const allDealsForStatuses = search
      ? await dealsRepository.getDealsWithSearch({
          searchQuery: search,
          filters: {
            conditions: filterConditions.filter((c) => c.field !== 'statusName'), // Remove status filter to get all deals
          },
          orders,
          pagination: { page: 1, limit: 1000 }, // Large limit to get all deals for status collection
        })
      : await dealsRepository.getDeals({
          filters: {
            conditions: filterConditions.filter((c) => c.field !== 'statusName'), // Remove status filter to get all deals
          },
          orders,
          pagination: { page: 1, limit: 1000 }, // Large limit to get all deals for status collection
        })

    // Collect unique statusNames from user's actual deals
    const uniqueStatusNames = new Set<string>()
    for (const deal of allDealsForStatuses.docs) {
      if (deal.statusName && typeof deal.statusName === 'string') {
        uniqueStatusNames.add(deal.statusName)
      }
    }

    // Load status labels from taxonomy only for statuses that user actually has
    let statusOptions: Array<{ value: string; label: string }> = []
    if (uniqueStatusNames.size > 0) {
      try {
        const { TaxonomyRepository } = await import('@/shared/repositories/taxonomy.repository')
        const taxonomyRepository = TaxonomyRepository.getInstance()
        const statuses = await taxonomyRepository.getTaxonomies({
          filters: {
            conditions: [
              {
                field: 'entity',
                operator: 'eq',
                values: ['deal.statusName'],
              },
              {
                field: 'name',
                operator: 'in',
                values: Array.from(uniqueStatusNames),
              },
            ],
          },
          orders: {
            orders: [{ field: 'sortOrder', direction: 'asc' }],
          },
          pagination: { page: 1, limit: 100 },
        })

        statusOptions =
          statuses.docs?.map((tax) => ({
            value: String(tax.name),
            label: (tax.title && String(tax.title)) || String(tax.name),
          })) ?? []
      } catch (err) {
        console.error('Failed to load deal status taxonomies for client:', err)
        // Fallback: use statusName as label if taxonomy lookup fails
        statusOptions = Array.from(uniqueStatusNames).map((name) => ({
          value: name,
          label: name,
        }))
      }
    }

    return new Response(
      JSON.stringify({
        deals: await Promise.all(
          result.docs.map((deal: any) => processDataClientDeal(deal as LoanApplication)),
        ),
        pagination: result.pagination,
        statusOptions,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Get deals error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to get deals', details: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * POST /api/c/deals
 * Create new deal application
 */
export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context

  if (!env.AUTH_SECRET) {
    return new Response(JSON.stringify({ error: 'Authentication not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const sessionUser = await getSession(request, env.AUTH_SECRET)

  if (!sessionUser) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json()
    
    // TODO: Validate body with Zod schema
    // TODO: Create deal application in database
    // For now, return success
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Deal application created',
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Create deal error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create deal', details: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })

export async function OPTIONS() {
  return onRequestOptions()
}

export const GET = withClientGuard(onRequestGet)


/**
 * Process deal data for client response
 */
export async function processDataClientDeal(deal: LoanApplication) {
  // Extract dataIn and exclude price, time (term), and credits
  // But keep totalAmount if it exists, or calculate from productPrice
  let processedDataIn: any = null
  let processedDataOut: any = null
  processedDataOut = {}
  
  // Parse dataIn if it's a string (JSONB from database)
  let dataInObj: any = null
  if (deal.dataIn) {
    if (typeof deal.dataIn === 'string') {
      try {
        dataInObj = JSON.parse(deal.dataIn)
      } catch (error) {
        console.error('Failed to parse dataIn:', error)
        dataInObj = null
      }
    } else if (typeof deal.dataIn === 'object') {
      dataInObj = deal.dataIn
    }
  }
  
  if (dataInObj) {
    const { productPrice, term, ...restDataIn } = dataInObj
    // Convert productPrice to number for totalAmount if totalAmount doesn't exist
    const dataInAny = restDataIn as any
    const priceNum = productPrice ? Number(String(productPrice).replace(/[^\d.-]/g, '')) : null
    const totalAmount = dataInAny.totalAmount 
      ? Number(dataInAny.totalAmount) 
      : (priceNum && Number.isFinite(priceNum) ? priceNum : null)
    
    // Get term as number (first value if array)
    const termMonths = term && Array.isArray(term) && term.length > 0 
      ? term[0] 
      : (typeof term === 'number' ? term : null)
    
    processedDataIn = {
      ...restDataIn,
      // Include totalAmount for display in table
      totalAmount: totalAmount && Number.isFinite(totalAmount) ? totalAmount : null,
      // Include purchasePrice (productPrice) for detail page
      purchasePrice: priceNum && Number.isFinite(priceNum) ? priceNum : null,
      // Include installmentTerm (term) for detail page
      installmentTerm: termMonths && Number.isFinite(termMonths) ? termMonths : null,
      // Include downPayment if exists
      downPayment: dataInAny.downPayment ? Number(dataInAny.downPayment) : null,
      // Include monthlyPayment if exists
      monthlyPayment: dataInAny.monthlyPayment ? Number(dataInAny.monthlyPayment) : null,
      // Include paymentSchedule if exists
      paymentSchedule: dataInAny.paymentSchedule || null,
    }
  }

  // Get status title from taxonomy
  let statusTitle: string = deal.statusName || ''
  if (deal.statusName) {
    try {
      const { TaxonomyRepository } = await import('@/shared/repositories/taxonomy.repository')
      const taxonomyRepository = TaxonomyRepository.getInstance()
      const statusTaxonomy = await taxonomyRepository.getTaxonomies({
        filters: {
          conditions: [
            {
              field: 'entity',
              operator: 'eq',
              values: ['deal.statusName'],
            },
            {
              field: 'name',
              operator: 'eq',
              values: [deal.statusName],
            },
          ],
        },
        pagination: { page: 1, limit: 1 },
      })
      
      if (statusTaxonomy.docs.length > 0 && statusTaxonomy.docs[0].title) {
        statusTitle = String(statusTaxonomy.docs[0].title)
      }
    } catch (error) {
      console.error('Failed to get status title from taxonomy:', error)
      // Fallback to statusName if taxonomy lookup fails
    }
  }

  // Return all deal fields except createdAt, updatedAt (time)
  const { createdAt, updatedAt, ...restDeal } = deal

  return {
    id: deal.daid,
    uuid: deal.uuid,
    fullDaid: deal.fullDaid,
    clientAid: deal.clientAid,
    createdAt: deal.createdAt,
    title: deal.title || 'Без названия',
    cycle: deal.cycle,
    status: statusTitle || deal.statusName,
    statusName: deal.statusName,
    xaid: deal.xaid,
    dataIn: processedDataIn,
    dataOut: processedDataOut,
    documents: deal.documents,
  }
}