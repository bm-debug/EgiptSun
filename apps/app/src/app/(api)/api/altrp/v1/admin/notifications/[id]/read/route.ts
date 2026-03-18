import { NextRequest, NextResponse } from "next/server"
import { withAdminGuard, type AuthenticatedRequestContext } from "@/shared/api-guard"
import { NoticesRepository } from "@/shared/repositories/notices.repository"
import { createDb } from "@/shared/repositories/utils"
import { schema } from "@/shared/schema"
import { and, eq, isNull } from "drizzle-orm"

const handlePost = async (
  context: AuthenticatedRequestContext,
  noticeId: string
): Promise<Response> => {
  try {
    const { user } = context
    const humanAid = user.user.humanAid

    if (!humanAid) {
      return NextResponse.json(
        {
          success: false,
          error: "User has no humanAid",
        },
        { status: 400 }
      )
    }

    const db = createDb()
    const noticesRepo = NoticesRepository.getInstance()

    // Find notice and verify it belongs to the user
    const [notice] = await db
      .select()
      .from(schema.notices as any)
      .where(
        and(
          eq(schema.notices.id, Number(noticeId)),
          eq(schema.notices.targetAid, humanAid),
          isNull(schema.notices.deletedAt)
        )
      )
      .limit(1)
      .execute()

    if (!notice) {
      return NextResponse.json(
        {
          success: false,
          error: "Notice not found",
        },
        { status: 404 }
      )
    }

    // Mark as read
    await noticesRepo.update((notice as any).uuid!, {
      isRead: true,
    })

    return NextResponse.json(
      {
        success: true,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Failed to mark notification as read:", error)
    const message = error instanceof Error ? error.message : "Failed to mark notification as read"
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handlePost(ctx, id)
  })(request, context)
}

