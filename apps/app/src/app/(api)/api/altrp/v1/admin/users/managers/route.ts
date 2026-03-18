/// <reference types="@cloudflare/workers-types" />

import { UsersRepository } from '@/shared/repositories/users.repository'
import { MeRepository } from '@/shared/repositories/me.repository'
import { Env } from '@/shared/types'
import { RequestContext } from '@/shared/types'
import type { altrpUser } from '@/shared/types/altrp'
import { withAdminGuard } from '@/shared/api-guard'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
} as const

const jsonHeaders = {
  ...corsHeaders,
  'content-type': 'application/json',
} as const

interface ManagerUser extends altrpUser {
  fullName?: string | null
  roles?: Array<{
    uuid: string
    name: string | null
    title: string | null
  }>
}

export const onRequestGet = async (context: RequestContext): Promise<Response> => {
  const { request, env } = context

  try {
    // Get all users
    const usersRepository = UsersRepository.getInstance()
    const allUsers = await usersRepository.findAll()

    // Filter users with admin/Administrator roles
    const meRepository = MeRepository.getInstance()
    const managers: ManagerUser[] = []

    for (const user of allUsers) {
      // Skip soft-deleted users
      if (user.deletedAt) continue

      try {
        const userWithRoles = await meRepository.findByIdWithRoles(Number(user.id), {
          includeHuman: true,
        })

        if (!userWithRoles) continue

        // Check if user has admin or Administrator role
        const hasAdminRole = userWithRoles.roles.some(
          (role) =>
            role.name === 'Administrator' ||
            role.name === 'admin' ||
            role.isSystem === true
        )

        if (hasAdminRole) {
          managers.push({
            ...user,
            fullName: userWithRoles.human?.fullName || null,
            roles: userWithRoles.roles.map((role) => ({
              uuid: role.uuid,
              name: role.name,
              title: (typeof role.title === 'string' ? role.title : null) as string | null,
            })),
          })
        }
      } catch (err) {
        console.error(`Failed to load roles for user ${user.uuid}:`, err)
        // Continue with next user
      }
    }

    return new Response(
      JSON.stringify({
        docs: managers,
      }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    )
  } catch (error) {
    console.error('Failed to fetch managers', error)
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

