/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { BaseMovesRepository } from '@/shared/repositories/base-moves.repository'

/**
 * GET /api/store/v2/s/sending/details?full_baid=...
 * Returns sending details with inventory items
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
          laidFrom: baseMove.laidFrom,
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
    console.error('Get sending details error:', error)
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
 * POST /api/store/v2/s/sending/details
 * Body: { full_baid, action: 'add_item', variantFullPaid, quantity, sellingPriceFact?, purchasePriceFact?, notes? }
 * or { full_baid, action: 'remove_item', itemUuid }
 * or { full_baid, action: 'send_for_approval' }
 * or { full_baid, action: 'update', title?, date?, laidTo? }
 */
async function handlePost(context: AuthenticatedRequestContext) {
  const { request, env } = context

  try {
    const body = await request.json() as {
      full_baid?: string
      action?: string
      variantFullPaid?: string
      quantity?: number
      sellingPriceFact?: number
      purchasePriceFact?: number
      notes?: string
      itemUuid?: string
      title?: string
      date?: string
      laidTo?: string
      contractorCaid?: string
      transportPrice?: number
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
        
        result = await repository.addSendingItem(body.full_baid, {
          variantFullPaid: body.variantFullPaid,
          quantity: body.quantity,
          sellingPriceFact: body.sellingPriceFact,
          purchasePriceFact: body.purchasePriceFact,
          notes: body.notes,
        })
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
        // Recalculate metrics after removing item
        if (result) {
          await repository.recalculateSendingMetrics(body.full_baid)
        }
        break

      case 'send_for_approval':
        // Recalculate metrics before sending for approval
        await repository.recalculateSendingMetrics(body.full_baid)
        // @ts-ignore
        result = await repository.sendForApproval(body.full_baid, context as any)
        break

      case 'update':
        result = await repository.updateSendingByFullBaid(body.full_baid, {
          title: body.title,
          date: body.date,
          laidTo: body.laidTo,
          contractorCaid: body.contractorCaid,
          transportPrice: body.transportPrice,
        })
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
    console.error('Sending details action error:', error)
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

