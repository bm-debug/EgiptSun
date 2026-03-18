import { NextResponse } from "next/server"
import { withAdminGuard, type AuthenticatedRequestContext } from "@/shared/api-guard"
import { UserSessionsRepository } from "@/shared/repositories/user-sessions.repository"
import { getSession } from "@/shared/session"

function getDeviceType(userAgent: string | null | undefined): "mobile" | "desktop" {
  const ua = (userAgent || "").toLowerCase()
  if (/(android|iphone|ipad|ipod)/i.test(ua)) return "mobile"
  return "desktop"
}

const handleGet = async (context: AuthenticatedRequestContext): Promise<Response> => {
  try {
    const repo = UserSessionsRepository.getInstance()
    const userId = Number(context.user.id)
    const sessions = await repo.listActiveByUserId(userId)

    const currentSession = context.env.AUTH_SECRET ? await getSession(context.request, context.env.AUTH_SECRET) : null
    const currentSessionUuid = currentSession?.sessionUuid

    return NextResponse.json(
      {
        success: true,
        sessions: sessions.map((s) => ({
          uuid: s.uuid,
          userAgent: s.userAgent || null,
          ip: s.ip || null,
          region: s.region || null,
          lastSeenAt: s.lastSeenAt || null,
          expiresAt: s.expiresAt || null,
          device: getDeviceType(s.userAgent),
          isCurrent: currentSessionUuid ? s.uuid === currentSessionUuid : false,
        })),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Failed to load sessions:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to load sessions",
      },
      { status: 500 },
    )
  }
}

export const GET = withAdminGuard(handleGet)


