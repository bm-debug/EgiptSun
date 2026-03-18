import { NextRequest, NextResponse } from 'next/server'
import { UsersRepository } from '@/shared/repositories/users.repository'
import { MeRepository } from '@/shared/repositories/me.repository'
import { HumanRepository } from '@/shared/repositories/human.repository'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { createDb } from '@/shared/repositories/utils'
import { schema } from '@/shared/schema'
import { and, eq, isNull } from 'drizzle-orm'

const handleGet = async (
  context: AuthenticatedRequestContext,
  haid: string
) => {
  try {
    const meRepository = MeRepository.getInstance()
    const humanRepository = HumanRepository.getInstance()

    // Find human by haid
    const human = await humanRepository.findByHaid(haid)

    if (!human) {
      return NextResponse.json({ error: 'Human not found' }, { status: 404 })
    }

    // Find user by humanAid
    const db = createDb()
    const [user] = await db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.humanAid, haid),
          isNull(schema.users.deletedAt)
        )
      )
      .limit(1)
      .execute()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user with roles
    const userWithRoles = await meRepository.findByIdWithRoles(Number(user.id))

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        roles: userWithRoles?.roles || [],
        human: human || null,
      },
    })
  } catch (error) {
    console.error('Failed to fetch user by haid', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message,
    }, { status: 500 })
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

