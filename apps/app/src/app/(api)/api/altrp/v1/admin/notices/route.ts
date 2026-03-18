"use server"

import { NextRequest, NextResponse } from "next/server"
import { withAdminGuard, AuthenticatedRequestContext } from "@/shared/api-guard"
import { DealsRepository } from "@/shared/repositories/deals.repository"
import { MessageThreadsRepository } from "@/shared/repositories/message-threads.repository"
import { createDb } from "@/shared/repositories/utils"
import { schema } from "@/shared/schema"
import { and, inArray, isNull, sql } from "drizzle-orm"

type AdminNotices = Record<string, number>

const handleGet = async (
  _context: AuthenticatedRequestContext,
  _request: NextRequest
): Promise<Response> => {
  try {
    const dealsRepository = DealsRepository.getInstance()
    const rows = await dealsRepository
      .getSelectQuery()
      .where(
        and(
          inArray(dealsRepository.schema.statusName, ["NEW", "SCORING"]),
          isNull(dealsRepository.schema.deletedAt),
          sql`COALESCE(${dealsRepository.schema.dataIn}::jsonb->>'type', '') = 'LOAN_APPLICATION'`,
          sql`COALESCE(${dealsRepository.schema.dataIn}::jsonb->>'viewed_at', '') = ''`
        )
      )
      .execute()

    // Get count of users with KYC status 'pending'
    const db = createDb()
    const [kycPendingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .innerJoin(schema.humans, sql`${schema.users.humanAid} = ${schema.humans.haid}`)
      .where(
        and(
          isNull(schema.users.deletedAt),
          sql`${schema.humans.dataIn}::jsonb->>'kycStatus' = 'pending'`
        )
      )
      .execute()

    // Get count of support chats with unread messages from clients
    const messageThreadsRepository = MessageThreadsRepository.getInstance()
    const unreadSupportChatsCount = await messageThreadsRepository.countChatsWithUnreadClientMessages()

    const response: AdminNotices = {
      new_loans_count: rows.length,
      kyc_pending_count: Number(kycPendingResult?.count || 0),
      unread_support_chats_count: unreadSupportChatsCount,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Failed to load admin notices:", error)
    const message = error instanceof Error ? error.message : "Failed to load admin notices"
    return NextResponse.json({ error: message }, { status: 500 })
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
