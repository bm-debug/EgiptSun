import { NextResponse } from 'next/server'
import { FinancesRepository } from '@/shared/repositories/finances.repository'
import type { DbFilters, DbOrders } from '@/shared/types/shared'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'

/**
 * GET /api/altrp/v1/admin/deals/[id]/finances
 * Returns list of finances (payments) for a specific deal by external deal ID (daid/fullDaid)
 * Admin version - not restricted to current user
 *
 * NOTE: [uuid] in the file path is actually the external deal ID (same as in client /c/deals/[id]).
 */
const onRequestGet = async (context: AuthenticatedRequestContext) => {
  const { params } = context
  const id = params?.uuid
  
  if (!id) {
    return NextResponse.json({ error: 'Deal ID is required' }, { status: 400 })
  }

  try {
    // Get finances for this deal using FinancesRepository
    const financesRepository = FinancesRepository.getInstance()
    
    // Build filters for finances (same logic as client endpoint)
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

    // Transform finances to response format - same as client endpoint
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
    console.error('Get finances error (admin):', error)
    return NextResponse.json(
      { error: 'Failed to get finances', details: String(error) },
      { status: 500 }
    )
  }
}

export const GET = withAdminGuard(onRequestGet)

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
