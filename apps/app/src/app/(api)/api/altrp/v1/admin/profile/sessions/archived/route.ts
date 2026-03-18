import { NextResponse } from "next/server"
import { withAdminGuard, type AuthenticatedRequestContext } from "@/shared/api-guard"
import { UserSessionsRepository } from "@/shared/repositories/user-sessions.repository"

function getDeviceType(userAgent: string | null | undefined): "mobile" | "desktop" {
  const ua = (userAgent || "").toLowerCase()
  if (/(android|iphone|ipad|ipod)/i.test(ua)) return "mobile"
  return "desktop"
}

const handleGet = async (context: AuthenticatedRequestContext): Promise<Response> => {
  try {
    const repo = UserSessionsRepository.getInstance()
    const userId = Number(context.user.id)
    const sessions = await repo.listRevokedByUserId(userId)

    return NextResponse.json(
      {
        success: true,
        sessions: sessions.map((s) => ({
          uuid: s.uuid,
          userAgent: s.userAgent || null,
          ip: s.ip || null,
          region: s.region || null,
          lastSeenAt: s.lastSeenAt || null,
          revokedAt: s.revokedAt || null,
          expiresAt: s.expiresAt || null,
          device: getDeviceType(s.userAgent),
        })),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Failed to load archived sessions:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to load archived sessions",
      },
      { status: 500 },
    )
  }
}

export const GET = withAdminGuard(handleGet)

