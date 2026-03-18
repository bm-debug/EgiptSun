import { NextRequest, NextResponse } from 'next/server'
import { DealsRepository } from '@/shared/repositories/deals.repository'
import { FinancesRepository } from '@/shared/repositories/finances.repository'
import type { DbFilters, DbOrders } from '@/shared/types/shared'
import { withClientGuard, AuthenticatedRequestContext } from '@/shared/api-guard'

/**
 * GET /api/altrp/v1/c/deals/[id]/finances
 * Returns list of finances (payments) for a specific deal
 */
export const GET = withClientGuard(async (context: AuthenticatedRequestContext) => {
  const { request, params } = context
  const id = params?.id
  
  if (!id) {
    return NextResponse.json({ error: 'Deal AID is required' }, { status: 400 })
  }

  try {
    const { human } = context.user
    
    if (!human?.haid) {
      return NextResponse.json({ error: 'Human profile not found' }, { status: 404 })
    }
    
    const dealsRepository = DealsRepository.getInstance()
    
    // First, verify that the deal belongs to the current user
    const dealFilters: DbFilters = {
      conditions: [
        {
          field: 'daid',
          operator: 'eq',
          values: [id],
        },
        {
          field: 'clientAid',
          operator: 'eq',
          values: [human.haid],
        },
      ],
    }
    
    const dealResult = await dealsRepository.getDeals({
      filters: dealFilters,
      pagination: { page: 1, limit: 1 },
    })

    const deal = dealResult.docs[0]

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found or access denied' }, { status: 404 })
    }

    // Get finances for this deal using FinancesRepository
    const financesRepository = FinancesRepository.getInstance()
    
    // Build filters for finances
    const financesFilters: DbFilters = {
      conditions: [
        {
          field: 'fullDaid',
          operator: 'eq',
          values: [id],
        },
      ],
    }

    const orders: DbOrders = {
      orders: [
        { field: 'order', direction: 'asc' },
        { field: 'createdAt', direction: 'asc' },
      ],
    }

    // Get all finances for this deal
    const financesResult = await financesRepository.getFiltered(
      financesFilters,
      orders,
      { page: 1, limit: 1000 }
    )

    // Transform finances to response format - only return client-visible fields
    const finances = financesResult.docs.map((finance) => {
      const dataIn = finance.dataIn && typeof finance.dataIn === 'object'
        ? finance.dataIn as any
        : {}
      
      const dataOut = finance.dataOut && typeof finance.dataOut === 'object'
        ? finance.dataOut as any
        : {}

      // finance.sum хранится в копейках (целое число), конвертируем в рубли
      const sumKopecks = finance.sum ? parseInt(finance.sum) : 0
      const sum = sumKopecks / 100 // Конвертируем копейки в рубли

      return {
        uuid: finance.uuid,
        statusName: finance.statusName,
        paymentDate: dataIn.paymentDate || null,
        sum: sum,
        paidAt: dataOut.paidAt || null,
        paymentNumber: dataIn.paymentNumber || null,
        order: finance.order ? parseFloat(finance.order) : 0,
      }
    })

    return NextResponse.json({
      success: true,
      finances,
      total: financesResult.pagination.total,
    })
  } catch (error) {
    console.error('Get finances error:', error)
    return NextResponse.json(
      { error: 'Failed to get finances', details: String(error) },
      { status: 500 }
    )
  }
})

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

