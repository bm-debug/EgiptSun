import { NextRequest, NextResponse } from "next/server"
import { withAdminGuard, type AuthenticatedRequestContext } from "@/shared/api-guard"
import { NoticesRepository } from "@/shared/repositories/notices.repository"
import { createDb } from "@/shared/repositories/utils"
import { schema } from "@/shared/schema"
import { and, eq, isNull, desc, sql } from "drizzle-orm"

const handleGet = async (
  context: AuthenticatedRequestContext,
  request: NextRequest
): Promise<Response> => {
  try {
    const { user } = context
    const url = new URL(request.url)
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || "20")))
    const offset = Math.max(0, Number(url.searchParams.get("offset") || "0"))

    // Get user's humanAid
    const humanAid = user.user.humanAid
    if (!humanAid) {
      return NextResponse.json(
        {
          success: true,
          notifications: [],
          total: 0,
        },
        { status: 200 }
      )
    }

    const db = createDb()

    // Get total count
    const totalRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.notices as any)
      .where(
        and(
          eq(schema.notices.targetAid, humanAid),
          isNull(schema.notices.deletedAt)
        )
      )
      .execute()

    const total = Number((totalRows?.[0] as any)?.count || 0)

    // Get notifications
    const notifications = await db
      .select()
      .from(schema.notices as any)
      .where(
        and(
          eq(schema.notices.targetAid, humanAid),
          isNull(schema.notices.deletedAt)
        )
      )
      .orderBy(desc(schema.notices.createdAt))
      .limit(limit)
      .offset(offset)
      .execute()

    // Format notifications
    const formattedNotifications = notifications.map((notice: any) => ({
      id: notice.id,
      uuid: notice.uuid,
      title: notice.title,
      typeName: notice.typeName,
      isRead: notice.isRead,
      createdAt: notice.createdAt,
      updatedAt: notice.updatedAt,
      dataIn: notice.dataIn,
    }))

    return NextResponse.json(
      {
        success: true,
        notifications: formattedNotifications,
        total,
        limit,
        offset,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Failed to load notifications:", error)
    const message = error instanceof Error ? error.message : "Failed to load notifications"
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> }
) {
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handleGet(ctx, request)
  })(request, context)
}

