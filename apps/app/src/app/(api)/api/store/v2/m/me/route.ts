/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { User } from '@/shared/schema/types'

/**
 * GET /api/store/v2/m/me
 * Returns current user information with employee data
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { user: userWithRoles } = context

  try {
    // User is already fetched and validated by the guard

    return new Response(
      JSON.stringify({
        user: {
          id: userWithRoles.user.id,
          email: userWithRoles.user.email,
          uuid: userWithRoles.user.uuid,
        },
        employee: userWithRoles.employee ? {
          eaid: userWithRoles.employee.eaid,
          fullEaid: userWithRoles.employee.fullEaid,
          email: userWithRoles.employee.email,
          statusName: userWithRoles.employee.statusName,
        } : null,
        human: userWithRoles.human ? {
          haid: userWithRoles.human.haid,
          fullName: userWithRoles.human.fullName,
        } : null,
        location: userWithRoles.location ? {
          laid: userWithRoles.location.laid,
          fullLaid: userWithRoles.location.fullLaid,
          title: userWithRoles.location.title,
          city: userWithRoles.location.city,
          type: userWithRoles.location.type,
        } : null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get me error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось получить информацию о пользователе. Произошла внутренняя ошибка сервера. Пожалуйста, попробуйте еще раз или обратитесь к администраторам системы с сообщением об этой ошибке.',
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

