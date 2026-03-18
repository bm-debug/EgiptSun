import { NextResponse } from 'next/server'
import { withRoleGuard, AuthenticatedRequestContext, withClientGuard } from '@/shared/api-guard'
import { MeRepository } from '@/shared/repositories/me.repository'
import { altrpHuman } from '@/shared/types/altrp'

/**
 * GET /api/altrp/v1/c/human
 * Returns current user's human profile
 */
const handleGet = async (context: AuthenticatedRequestContext): Promise<Response> => {
  const { user } = context

  try {
    // Get human profile from user first
    let human = user.human
    if (!human) {
      const meRepository = MeRepository.getInstance()
      const userWithRoles = await meRepository.findByIdWithRoles(Number(user.id), { includeHuman: true })
      human = userWithRoles?.human
    }

    if (!human) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Профиль не найден',
        },
        { status: 404 }
      )
    }

    // Parse dataIn if it's a string
    let dataIn: any = {}
    if (human.dataIn) {
      try {
        dataIn = typeof human.dataIn === 'string' ? JSON.parse(human.dataIn) : human.dataIn
      } catch (error) {
        console.error('Ошибка при парсинге human.dataIn:', error)
        dataIn = {}
      }
    }

    // Return human profile with all data
    return NextResponse.json(
      {
        success: true,
        human: {
          haid: human.haid,
          uuid: human.uuid,
          fullName: human.fullName,
          email: human.email,
          birthday: human.birthday,
          statusName: human.statusName,
          dataIn: dataIn,
          createdAt: human.createdAt,
          updatedAt: human.updatedAt,
        } as altrpHuman,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Ошибка при получении профиля:', error)
    const message = error instanceof Error ? error.message : 'Неожиданная ошибка'

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

export const GET = withClientGuard(handleGet)

