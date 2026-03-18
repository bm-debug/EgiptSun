/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withStorekeeperGuard } from '@/shared/api-guard'
import { BaseMovesRepository } from '@/shared/repositories/base-moves.repository'
import { MeRepository } from '@/shared/repositories/me.repository'

/**
 * POST /api/store/v2/s/inventory/add
 * Add inventory item to location with specified status
 * Body: { variantFullPaid, quantity, status, notes? }
 */
async function handlePost(context: AuthenticatedRequestContext) {
  const { request, env, user: sessionUserWithRoles } = context

  try {
    // Re-fetch user with location info because the guard might not include it by default
    // Note: The guard uses findByIdWithRoles without specific includes. 
    // However, we can just re-fetch if needed, OR update guard. 
    // For now, let's re-fetch to be safe and explicit as per original code requirement.
    const meRepository = MeRepository.getInstance()
    const userWithRoles = await meRepository.findByIdWithRoles(Number(sessionUserWithRoles.user.id), {
      includeEmployee: true,
      includeLocation: true,
    })

    if (!userWithRoles?.location?.laid) {
      return new Response(
        JSON.stringify({ 
          error: 'Склад не определён для текущего пользователя' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const body = await request.json() as {
      variantFullPaid?: string
      quantity?: number
      status?: string
      notes?: string
    }

    if (!body.variantFullPaid || !body.quantity || !body.status) {
      return new Response(
        JSON.stringify({ 
          error: 'Параметры variantFullPaid, quantity и status обязательны' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const locationLaid = userWithRoles.location.laid

    // Add inventory to location
    const baseMovesRepo = BaseMovesRepository.getInstance()
    const result = await baseMovesRepo.addInventoryToLocation({
      locationLaid,
      variantFullPaid: body.variantFullPaid,
      quantity: body.quantity,
      status: body.status,
      notes: body.notes,
      ownerEaid: userWithRoles.employee?.fullEaid || undefined,
    })

    if (!result) {
      return new Response(
        JSON.stringify({ 
          error: 'Не удалось добавить товар на склад' 
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
    console.error('Add inventory error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось добавить товар',
        details: String(error) 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const POST = withStorekeeperGuard(handlePost)

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}


