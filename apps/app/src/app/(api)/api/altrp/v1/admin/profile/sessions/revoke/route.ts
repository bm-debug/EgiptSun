import { NextResponse } from "next/server"
import { withAdminGuard, type AuthenticatedRequestContext } from "@/shared/api-guard"
import { UserSessionsRepository } from "@/shared/repositories/user-sessions.repository"

type RevokeRequest = {
  sessionUuid?: string
}

const handlePost = async (context: AuthenticatedRequestContext): Promise<Response> => {
  const body = (await context.request.json().catch(() => ({}))) as RevokeRequest
  const sessionUuid = (body.sessionUuid || "").trim()
  if (!sessionUuid) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", message: "sessionUuid is required" },
      { status: 400 },
    )
  }

  const repo = UserSessionsRepository.getInstance()
  const userId = Number(context.user.id)
  await repo.revokeSession(sessionUuid, userId)

  return NextResponse.json({ success: true }, { status: 200 })
}

export const POST = withAdminGuard(handlePost)


