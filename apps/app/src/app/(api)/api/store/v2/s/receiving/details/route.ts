/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withStorekeeperGuard } from '@/shared/api-guard'
import { BaseMovesRepository } from '@/shared/repositories/base-moves.repository'
import { RelationInventoryDataIn } from '@/shared/types/store'

const toKopecks = (value: unknown): number | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }

  const numeric = typeof value === 'string' ? Number(value) : value

  if (typeof numeric !== 'number' || Number.isNaN(numeric)) {
    return undefined
  }

  return Math.round(numeric * 100)
}

/**
 * GET /api/store/v2/s/receiving/details?full_baid=...
 * Returns base move details with inventory items
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { request, env } = context

  try {
    const url = new URL(request.url)
    const fullBaid = url.searchParams.get('full_baid')

    if (!fullBaid) {
      return new Response(
        JSON.stringify({ 
          error: 'Параметр full_baid обязателен' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const repository = BaseMovesRepository.getInstance()
    const baseMove = await repository.findByFullBaid(fullBaid)

    if (!baseMove) {
      return new Response(
        JSON.stringify({ 
          error: 'Запись не найдена' 
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const inventoryItems = await repository.getInventoryItems(fullBaid)
    inventoryItems.forEach((item) => {
      const dataIn = (item as any).dataIn ?? (item as any).data_in
      if (!dataIn) {
        return
      }
      dataIn.quantity = dataIn.quantity ?? dataIn.temp_quantity ?? 0
      ;(item as any).dataIn = dataIn
      ;(item as any).data_in = dataIn
    })


    let dataIn = null
    dataIn = baseMove.dataIn as Record<string, unknown> | null

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: baseMove.id,
          uuid: baseMove.uuid,
          fullBaid: baseMove.fullBaid,
          number: baseMove.number,
          title: baseMove.title,
          laidTo: baseMove.laidTo,
          statusName: baseMove.statusName,
          xaid: baseMove.xaid,
          createdAt: baseMove.createdAt,
          updatedAt: baseMove.updatedAt,
          dataIn,
          inventoryItems,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get receiving details error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось загрузить данные',
        details: String(error) 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * POST /api/store/v2/s/receiving/details
 * Body: { full_baid, action: 'add_item', variantFullPaid, quantity }
 * or { full_baid, action: 'remove_item', itemUuid }
 * or { full_baid, action: 'send_for_approval' }
 * or { full_baid, action: 'update', title, transportCost, date }
 */
async function handlePost(context: AuthenticatedRequestContext) {
  const { request, env } = context

  try {
    const body = await request.json() as {
      full_baid?: string
      action?: string
      variantFullPaid?: string
      quantity?: number
      itemUuid?: string
      title?: string
      transportCost?: number
      date?: string
    }

    if (!body.full_baid || !body.action) {
      return new Response(
        JSON.stringify({ 
          error: 'Параметры full_baid и action обязательны' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const repository = BaseMovesRepository.getInstance()
    const baseMove = await repository.findByFullBaid(body.full_baid)

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

    const restrictedActions = new Set(['add_item', 'remove_item', 'update'])
    const statusName = (baseMove.statusName || '').toUpperCase()
    if (restrictedActions.has(body.action) && statusName !== 'IN_PROGRESS') {
      return new Response(
        JSON.stringify({ 
          error: 'Редактирование возможно только для машин в статусе IN_PROGRESS' 
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    let result = null

    switch (body.action) {
      case 'add_item':
        if (!body.variantFullPaid || !body.quantity) {
          return new Response(
            JSON.stringify({ 
              error: 'Для добавления позиции необходимы variantFullPaid и quantity' 
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
        
        result = await repository.addInventoryItem(body.full_baid, {
          variantFullPaid: body.variantFullPaid,
          quantity: body.quantity,
        })
        // Note: addInventoryItem already calls recalculateReceivingMetrics internally
        break

      case 'remove_item':
        if (!body.itemUuid) {
          return new Response(
            JSON.stringify({ 
              error: 'Для удаления позиции необходим itemUuid' 
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
        result = await repository.removeInventoryItem(body.full_baid, body.itemUuid)
        // Note: removeInventoryItem already calls recalculateReceivingMetrics internally
        break

      case 'send_for_approval':
        // Recalculate metrics before sending for approval
        await repository.recalculateReceivingMetrics(body.full_baid)
        // @ts-ignore
        result = await repository.sendForApproval(body.full_baid, context)
        break

      case 'update':
        result = await repository.updateReceivingByFullBaid(body.full_baid, {
          title: body.title,
          transportCost: toKopecks(body.transportCost),
          date: body.date,
        })
        // Note: updateReceivingByFullBaid already calls recalculateReceivingMetrics internally
        break

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Неизвестное действие' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
    }

    if (!result) {
      return new Response(
        JSON.stringify({ 
          error: 'Не удалось выполнить операцию. Возможно, статус не позволяет редактирование.' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Receiving details action error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось выполнить операцию',
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
export const POST = withStorekeeperGuard(handlePost)

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


