import { NextResponse } from "next/server"
import { withAdminGuard, type AuthenticatedRequestContext } from "@/shared/api-guard"
import { UsersRepository } from "@/shared/repositories/users.repository"
import { verifyPassword, preparePassword, validatePassword } from "@/shared/password"

type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
}

const handlePost = async (context: AuthenticatedRequestContext): Promise<Response> => {
  const { request, user } = context

  const body = (await request.json()) as ChangePasswordRequest
  const { currentPassword, newPassword } = body

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", message: "Current and new password are required" },
      { status: 400 },
    )
  }

  const passwordValidation = validatePassword(newPassword)
  if (!passwordValidation.valid) {
    return NextResponse.json(
      {
        success: false,
        error: "VALIDATION_ERROR",
        message: passwordValidation.error || "New password does not meet requirements",
      },
      { status: 400 },
    )
  }

  const usersRepository = UsersRepository.getInstance()
  const persistedUser = await usersRepository.findByEmail(user.email)

  if (!persistedUser) {
    return NextResponse.json(
      { success: false, error: "NOT_FOUND", message: "User not found" },
      { status: 404 },
    )
  }

  if (!persistedUser.salt || !persistedUser.passwordHash) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: "Password data missing" },
      { status: 500 },
    )
  }

  const isValidPassword = await verifyPassword(
    persistedUser.salt,
    currentPassword,
    persistedUser.passwordHash,
  )

  if (!isValidPassword) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", message: "Current password is incorrect" },
      { status: 400 },
    )
  }

  const { hashedPassword, salt } = await preparePassword(newPassword)
  await usersRepository.update(user.uuid, { passwordHash: hashedPassword, salt })

  return NextResponse.json(
    { success: true, message: "Password updated" },
    { status: 200 },
  )
}

export const POST = withAdminGuard(handlePost)


