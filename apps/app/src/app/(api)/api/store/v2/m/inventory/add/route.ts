/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { BaseMovesRepository } from '@/shared/repositories/base-moves.repository'
import { ProductsRepository } from '@/shared/repositories/products.repository'
import { MeRepository } from '@/shared/repositories/me.repository'

/**
 * POST /api/store/v2/s/inventory/add
 * Add inventory item to location with specified status
 * Body: { variantFullPaid, quantity, status, notes? }
 */
async function handlePost(context: AuthenticatedRequestContext) {
  const { request, env, user: sessionUserWithRoles } = context

  try {
    // Get user with employee and location info
    // We need to re-fetch or ensure we have this info. 
    // guard provides user with roles, but maybe not employee/location includes.
    // Let's fetch it to be safe as original code did.
    const meRepository = MeRepository.getInstance()
    const userWithRoles = await meRepository.findByIdWithRoles(Number(sessionUserWithRoles.user.id), {
      includeEmployee: true,
      includeLocation: true,
    })

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

    // Add inventory to location
    const baseMovesRepo = BaseMovesRepository.getInstance()
    const product = await ProductsRepository.getInstance().findByPaid(body.variantFullPaid)

    //@ts-ignore
    const locationLaid = product?.dataIn?.warehouse_laid

    if (!locationLaid) {
      return new Response(
        JSON.stringify({ 
          error: 'Локация не найдена' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const result = await baseMovesRepo.addInventoryToLocation({
      locationLaid,
      variantFullPaid: body.variantFullPaid,
      quantity: body.quantity,
      status: body.status,
      notes: body.notes,
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

export const POST = withManagerGuard(handlePost)

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

