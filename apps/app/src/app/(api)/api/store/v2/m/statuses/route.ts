/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'

/**
 * GET /api/store/v2/m/statuses?entity=base_moves
 * Returns statuses for specified entity
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { request, env } = context

  try {
    const url = new URL(request.url)
    const entity = url.searchParams.get('entity')

    if (!entity) {
      return new Response(
        JSON.stringify({ 
          error: 'Параметр entity обязателен' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // For now, return hardcoded statuses for base_moves from system seeds
    // TODO: Create statuses table schema and fetch from DB
    const baseMovesStatuses = [
      { name: 'DRAFT', title: 'Черновик', sortOrder: 200 },
      { name: 'CANCELLED', title: 'Отменено', sortOrder: 400 },
      { name: 'ON_APPROVAL', title: 'На согласовании', sortOrder: 500 },
      { name: 'IN_PROGRESS', title: 'В работе', sortOrder: 600 },
      { name: 'ACTIVE', title: 'Активно', sortOrder: 700 },
      { name: 'COMPLETED', title: 'Завершено', sortOrder: 800 },
      { name: 'ON_PAUSE', title: 'На паузе', sortOrder: 900 },
    ]

    let statuses = []

    if (entity === 'base_moves') {
      statuses = baseMovesStatuses
    } else {
      return new Response(
        JSON.stringify({ 
          error: `Статусы для сущности ${entity} не найдены` 
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        statuses,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get statuses error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось получить список статусов',
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

