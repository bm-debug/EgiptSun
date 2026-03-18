import { NextResponse } from 'next/server'
import { withRoleGuard, AuthenticatedRequestContext, withClientGuard } from '@/shared/api-guard'
import { UsersRepository } from '@/shared/repositories/users.repository'
import { verifyPassword, preparePassword, validatePassword } from '@/shared/password'

interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

const handlePost = async (context: AuthenticatedRequestContext): Promise<Response> => {
  const { request, user } = context

  try {
    const body = (await request.json()) as ChangePasswordRequest
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Текущий пароль и новый пароль обязательны',
        },
        { status: 400 }
      )
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: passwordValidation.error || 'Новый пароль не соответствует требованиям',
        },
        { status: 400 }
      )
    }

    // Get user with password hash
    const usersRepository = UsersRepository.getInstance()
    const persistedUser = await usersRepository.findByEmail(user.email)

    if (!persistedUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Пользователь не найден',
        },
        { status: 404 }
      )
    }

    // Verify current password
    if (!persistedUser.salt || !persistedUser.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Ошибка при проверке пароля',
        },
        { status: 500 }
      )
    }

    const isValidPassword = await verifyPassword(
      persistedUser.salt,
      currentPassword,
      persistedUser.passwordHash
    )

    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Текущий пароль неверен',
        },
        { status: 400 }
      )
    }

    // Prepare new password
    const { hashedPassword, salt } = await preparePassword(newPassword)

    // Update password
    await usersRepository.update(user.uuid, {
      passwordHash: hashedPassword,
      salt,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Пароль успешно изменен',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Change password error:', error)
    const message = error instanceof Error ? error.message : 'Не удалось изменить пароль'

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

export const POST = withClientGuard(handlePost)

