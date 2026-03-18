/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withStorekeeperGuard } from '@/shared/api-guard'
import { BaseMovesRepository } from '@/shared/repositories/base-moves.repository'
import { MeRepository } from '@/shared/repositories/me.repository'

/**
 * POST /api/store/v2/s/sending/confirm
 * Confirm sending base move (only manager)
 * Body: { full_baid }
 */
async function handlePost(context: AuthenticatedRequestContext) {
  const { request, env, user: sessionUserWithRoles } = context

  try {
    // Get user with human info
    const meRepository = MeRepository.getInstance()
    const userWithRoles = await meRepository.findByIdWithRoles(Number(sessionUserWithRoles.user.id), {
      includeHuman: true,
    })

    if (!userWithRoles?.human?.haid) {
      return new Response(
        JSON.stringify({ 
          error: 'Информация о человеке не найдена. Обратитесь к администратору системы.' 
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const body = await request.json() as {
      full_baid?: string
    }

    if (!body.full_baid) {
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
    
    try {
      const result = await repository.confirmSending({
        fullBaid: body.full_baid,
        humanAid: userWithRoles.human.haid,
      })

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
      // Handle permission errors and other errors
      const errorMessage = error instanceof Error ? error.message : 'Не удалось подтвердить машину'
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  } catch (error) {
    console.error('Confirm sending error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось подтвердить исходящую машину',
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


