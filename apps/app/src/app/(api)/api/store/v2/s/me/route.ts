/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withStorekeeperGuard } from '@/shared/api-guard'
import { MeRepository } from '@/shared/repositories/me.repository'

/**
 * GET /api/store/v2/s/me
 * Returns current user information with employee data
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { user: userWithRoles, env } = context

  try {
    // We need full employee info which might not be fully loaded by the guard if it does lazy loading
    // But looking at api-guard, it fetches findByIdWithRoles which should include roles.
    // The original code requested includeEmployee: true, includeHuman: true, includeLocation: true
    // api-guard's findByIdWithRoles usually just gets roles.
    // So we should re-fetch with specific includes to be safe and get all data.

    const meRepository = MeRepository.getInstance()
    const fullUser = await meRepository.findByIdWithRoles(Number(userWithRoles.user.id), {
      includeEmployee: true,
      includeHuman: true,
      includeLocation: true,
    })

    if (!fullUser) {
       return new Response(
        JSON.stringify({ 
          error: 'Пользователь не найден в системе. Ваша сессия может быть повреждена. Попробуйте выйти и войти заново или обратитесь к администраторам системы.' 
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        user: {
          id: fullUser.id,
          email: fullUser.email,
          uuid: fullUser.uuid,
        },
        employee: fullUser.employee ? {
          eaid: fullUser.employee.eaid,
          fullEaid: fullUser.employee.fullEaid,
          email: fullUser.employee.email,
          statusName: fullUser.employee.statusName,
        } : null,
        human: fullUser.human ? {
          haid: fullUser.human.haid,
          fullName: fullUser.human.fullName,
        } : null,
        location: fullUser.location ? {
          laid: fullUser.location.laid,
          fullLaid: fullUser.location.fullLaid,
          title: fullUser.location.title,
          city: fullUser.location.city,
          type: fullUser.location.type,
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

export const GET = withStorekeeperGuard(handleGet)

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


