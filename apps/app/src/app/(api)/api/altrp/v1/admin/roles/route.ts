/// <reference types="@cloudflare/workers-types" />

import { RolesRepository } from '@/shared/repositories/roles.repository'
import { MeRepository } from '@/shared/repositories/me.repository'
import { Env } from '@/shared/types'
import { RequestContext } from '@/shared/types'
import { getSession } from '@/shared/session'
import { eq, and, or, isNull } from 'drizzle-orm'
import { schema } from '@/shared/schema/schema'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
} as const

const jsonHeaders = {
  ...corsHeaders,
  'content-type': 'application/json',
} as const

const ADMIN_ROLE_NAMES = ['Administrator', 'admin']

export const onRequestGet = async (context: AuthenticatedRequestContext): Promise<Response> => {
  const { user: userWithRoles } = context

  try {
    // Check if current user is super administrator
    const isSuperAdmin = userWithRoles.roles.some(
      (role) => role.name === 'Administrator'
    )

    // Get all roles (excluding soft-deleted)
    const rolesRepository = RolesRepository.getInstance()
    let roles = await rolesRepository.getSelectQuery()
      .where(isNull(schema.roles.deletedAt))
      .execute()

    // Filter out admin roles if user is not super admin
    if (!isSuperAdmin) {
      roles = roles.filter(
        (role) => !ADMIN_ROLE_NAMES.includes(role.name || '')
      )
    }

    // Sort by order
    roles.sort((a, b) => {
      const aOrder = typeof a.order === 'number' ? a.order : Number(a.order) || 0
      const bOrder = typeof b.order === 'number' ? b.order : Number(b.order) || 0
      return aOrder - bOrder
    })

    return new Response(
      JSON.stringify({
        docs: roles,
      }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    )
  } catch (error) {
    console.error('Failed to fetch roles', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return new Response(
      JSON.stringify({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message,
      }),
      {
        status: 500,
        headers: jsonHeaders,
      },
    )
  }
}

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, {
    status: 204,
    headers: corsHeaders,
  })

type HandlerContext = Parameters<typeof onRequestGet>[0]

export const GET = withAdminGuard(onRequestGet)

export async function OPTIONS() {
  return onRequestOptions()
}

