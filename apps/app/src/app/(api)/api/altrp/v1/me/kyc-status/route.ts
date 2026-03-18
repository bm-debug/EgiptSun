import { NextResponse } from 'next/server'
import { withNonAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { MeRepository } from '@/shared/repositories/me.repository'

const handleGet = async (context: AuthenticatedRequestContext): Promise<Response> => {
  const { user } = context

  try {
    // Get human profile from user
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

    // Check KYC status
    const statusName = human.statusName || null
    const isVerified = statusName === 'VERIFIED'

    // Parse dataIn to get kycStatus if available
    let kycStatus: string | null = null
    if (human.dataIn) {
      try {
        const dataIn = typeof human.dataIn === 'string' 
          ? JSON.parse(human.dataIn) 
          : human.dataIn
        kycStatus = dataIn.kycStatus || null
      } catch (error) {
        console.error('Error parsing human.dataIn:', error)
      }
    }

    return NextResponse.json(
      {
        success: true,
        verified: isVerified,
        statusName,
        kycStatus,
        message: isVerified 
          ? 'Пользователь верифицирован' 
          : 'Требуется верификация для выполнения этого действия',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get KYC status error:', error)
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

export const GET = withNonAdminGuard(handleGet)

