"use server"

import { NextRequest, NextResponse } from "next/server"
import { withClientGuard, AuthenticatedRequestContext } from "@/shared/api-guard"
import { MessageThreadsRepository } from "@/shared/repositories/message-threads.repository"

type ClientNotices = Record<string, number>

const handleGet = async (
  context: AuthenticatedRequestContext,
  _request: NextRequest
): Promise<Response> => {
  try {
    if (!context.user?.humanAid) {
      return NextResponse.json(
        { error: "User must have human profile" },
        { status: 400 }
      )
    }

    const messageThreadsRepository = MessageThreadsRepository.getInstance()
    const unreadSupportChatsCount = await messageThreadsRepository.countChatsWithUnreadAdminMessages(
      context.user.humanAid
    )

    const response: ClientNotices = {
      unread_support_chats_count: unreadSupportChatsCount,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Failed to load client notices:", error)
    const message = error instanceof Error ? error.message : "Failed to load client notices"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> }
) {
  return withClientGuard(async (ctx: AuthenticatedRequestContext) => {
    return handleGet(ctx, request)
  })(request, context)
}

