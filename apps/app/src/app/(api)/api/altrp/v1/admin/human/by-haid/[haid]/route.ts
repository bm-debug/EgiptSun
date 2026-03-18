import { NextRequest, NextResponse } from 'next/server'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { HumanRepository } from '@/shared/repositories/human.repository'
import { UsersRepository } from '@/shared/repositories/users.repository'

const handleGet = async (
  context: AuthenticatedRequestContext,
  haid: string
): Promise<Response> => {
  try {
    const humanRepository = HumanRepository.getInstance()
    const human = await humanRepository.findByHaid(haid)

    const usersRepository = UsersRepository.getInstance()
    const user = await usersRepository.findByEmail(human.email)
    
    if (!human) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Human not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        human: { ...human, user: user },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get human by haid error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message,
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ haid: string }> }
) {
  const params = await context.params
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handleGet(ctx, params.haid)
  })(request, { params: Promise.resolve(params) })
}

