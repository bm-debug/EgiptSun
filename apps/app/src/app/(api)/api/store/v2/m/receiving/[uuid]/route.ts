/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { BaseMovesRepository } from '@/shared/repositories/base-moves.repository'
import { MeRepository } from '@/shared/repositories/me.repository'

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
 * GET /api/store/v2/s/receiving/:uuid
 * Gets a receiving base move by uuid
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { env, params } = context
  const uuid = params?.uuid

  try {
    if (!uuid) {
      return new Response(
        JSON.stringify({ 
          error: 'Не указан идентификатор записи' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const repository = BaseMovesRepository.getInstance()
    const baseMove = await repository.findByUuid(uuid)

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
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get receiving error:', error)
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
 * PATCH /api/store/v2/s/receiving/:uuid
 * Updates an existing receiving base move
 */
async function handlePatch(context: AuthenticatedRequestContext) {
  const { request, env, params, user: sessionUserWithRoles } = context
  const uuid = params?.uuid

  try {
    // Get user with employee info
    const meRepository = MeRepository.getInstance()
    // Re-fetch to ensure we have employee info if needed, though sessionUserWithRoles might have it if guard was configured to include it.
    // The guard in api-guard.ts fetches user with `findByIdWithRoles(..., { includeEmployee: true, ... })`? 
    // No, `api-guard.ts` `withRoleGuard` calls `findByIdWithRoles` without extra options by default.
    // So we need to re-fetch or modify guard. Re-fetching is safer for migration.
    const userWithRoles = await meRepository.findByIdWithRoles(Number(sessionUserWithRoles.user.id), {
      includeEmployee: true,
    })

    if (!userWithRoles?.employee?.eaid) {
      return new Response(
        JSON.stringify({ 
          error: 'Информация о сотруднике не найдена. Ваш аккаунт не связан с профилем сотрудника в системе. Обратитесь к администраторам системы для настройки вашего профиля.' 
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (!uuid) {
      return new Response(
        JSON.stringify({ 
          error: 'Не указан идентификатор записи. Невозможно определить, какую запись необходимо обновить. Обратитесь к администраторам системы.' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const body = await request.json() as {
      title?: string
      transportCost?: number
      date?: string
    }

    // Update receiving base move
    const repository = BaseMovesRepository.getInstance()
    
    // Verify ownership
    const existing = await repository.findByUuid(uuid)
    if (!existing) {
      return new Response(
        JSON.stringify({ 
          error: 'Запись о входящей машине не найдена. Возможно, она была удалена или вы указали неверный идентификатор. Обратитесь к администраторам системы, если проблема повторяется.' 
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (existing.xaid !== userWithRoles.employee.eaid) {
      return new Response(
        JSON.stringify({ 
          error: 'Недостаточно прав для редактирования. Вы можете редактировать только те записи, которые создали сами. Эта запись принадлежит другому пользователю. Обратитесь к администраторам системы, если вам необходим доступ.' 
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const updated = await repository.updateReceiving(uuid, {
      title: body.title,
      transportCost: toKopecks(body.transportCost),
      date: body.date,
    })

    if (!updated) {
      return new Response(
        JSON.stringify({ 
          error: 'Не удалось обновить запись о входящей машине. Произошла ошибка при сохранении данных. Пожалуйста, попробуйте еще раз или обратитесь к администраторам системы.' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: updated.id,
          uuid: updated.uuid,
          title: updated.title,
          statusName: updated.statusName,
          updatedAt: updated.updatedAt,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Update receiving error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось обновить запись о входящей машине. Произошла внутренняя ошибка сервера. Пожалуйста, попробуйте еще раз или обратитесь к администраторам системы с сообщением об этой ошибке.',
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
export const PATCH = withManagerGuard(handlePatch)

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

