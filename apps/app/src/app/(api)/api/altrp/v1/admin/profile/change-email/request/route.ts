import { NextResponse } from "next/server"
import { withAdminGuard, type AuthenticatedRequestContext } from "@/shared/api-guard"
import { UsersRepository } from "@/shared/repositories/users.repository"
import { requestEmailChange } from "@/shared/services/email-change.service"
import { LANGUAGES } from "@/settings"

type ChangeEmailRequest = {
  newEmail?: string
  locale?: string
}

type LanguageCode = (typeof LANGUAGES)[number]["code"]

function isLanguageCode(value: string): value is LanguageCode {
  return LANGUAGES.some((l) => l.code === value)
}

const handlePost = async (context: AuthenticatedRequestContext): Promise<Response> => {
  const { request, env, user } = context

  const body = (await request.json()) as ChangeEmailRequest
  const newEmail = (body.newEmail || "").trim().toLowerCase()
  const requestedLocale = (body.locale || "").trim()
  const locale: LanguageCode = isLanguageCode(requestedLocale) ? requestedLocale : "en"

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)
  if (!newEmail || !isValidEmail) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", message: "Invalid email" },
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

  if (persistedUser.email.toLowerCase() === newEmail) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", message: "New email must be different" },
      { status: 400 },
    )
  }

  const existing = await usersRepository.findByEmail(newEmail)
  if (existing && existing.uuid !== persistedUser.uuid) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", message: "Email already in use" },
      { status: 400 },
    )
  }

  await requestEmailChange(env, persistedUser, newEmail, { request, locale })

  return NextResponse.json(
    { success: true, message: "Verification link sent" },
    { status: 200 },
  )
}

export const POST = withAdminGuard(handlePost)


