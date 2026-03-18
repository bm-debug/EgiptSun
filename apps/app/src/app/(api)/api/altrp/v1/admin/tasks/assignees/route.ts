import { NextRequest, NextResponse } from 'next/server'
import { buildRequestEnv } from '@/shared/env'
import { getSession } from '@/shared/session'
import { MeRepository, type UserWithRoles } from '@/shared/repositories/me.repository'
import type { TaskAssignee } from '@/shared/types/tasks'

const jsonHeaders = { 'content-type': 'application/json' }

type AuthSuccess = { user: NonNullable<UserWithRoles> }
type AuthResult = AuthSuccess | { response: NextResponse }

const authenticate = async (
  request: NextRequest
): Promise<AuthResult> => {
  const env = buildRequestEnv()

  if (!env.AUTH_SECRET) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Authentication not configured',
        },
        { status: 500, headers: jsonHeaders }
      ),
    }
  }

  const session = await getSession(request, env.AUTH_SECRET)
  if (!session?.id) {
    return {
      response: NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Unauthorized' },
        { status: 401, headers: jsonHeaders }
      ),
    }
  }

  const meRepo = MeRepository.getInstance()
  const user = await meRepo.findByIdWithRoles(Number(session.id), { includeHuman: true })

  if (!user) {
    return {
      response: NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'User not found' },
        { status: 401, headers: jsonHeaders }
      ),
    }
  }

  return { user }
}

export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if ('response' in auth) {
    return auth.response
  }

  try {
    const meRepo = MeRepository.getInstance()
    const assignees = await meRepo.findTaskAssignees(['Administrator', 'admin'], auth.user.user.uuid)

    return NextResponse.json(
      {
        success: true,
        assignees: assignees as TaskAssignee[],
      },
      { status: 200, headers: jsonHeaders }
    )
  } catch (error) {
    console.error('Failed to fetch task assignees', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500, headers: jsonHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...jsonHeaders,
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  })
}

