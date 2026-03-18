import { NextResponse } from "next/server"
import { MessageThreadsRepository } from "@/shared/repositories/message-threads.repository"
import { MessagesRepository } from "@/shared/repositories/messages.repository"
import { withTesterGuard, AuthenticatedRequestContext } from "@/shared/api-guard"
import { altrpSupportChat, altrpSupportChatDataIn } from "@/shared/types/altrp-support"
import type { DbFilters, DbOrders, DbPagination } from "@/shared/types/shared"
import { buildRequestEnv } from "@/shared/env"

const parseQueryParams = (url: URL): { filters: DbFilters; orders: DbOrders; pagination: DbPagination } => {
  const filters: DbFilters = { conditions: [] }
  const orders: DbOrders = { orders: [] }
  const pagination: DbPagination = {}

  const page = url.searchParams.get("page")
  const limit = url.searchParams.get("limit")
  if (page) pagination.page = parseInt(page, 10)
  if (limit) pagination.limit = parseInt(limit, 10)

  const status = url.searchParams.get("status")
  if (status) {
    filters.conditions?.push({ field: "statusName", operator: "eq", values: [status] })
  }

  const orderBy = url.searchParams.get("orderBy")
  const orderDirection = url.searchParams.get("orderDirection") as "asc" | "desc" | null
  if (orderBy && orderDirection) {
    orders.orders?.push({ field: orderBy, direction: orderDirection })
  } else {
    orders.orders?.push({ field: "updatedAt", direction: "desc" })
  }

  filters.conditions?.push({ field: "deletedAt", operator: "isNull", values: [] })
  return { filters, orders, pagination }
}

async function handleGet(context: AuthenticatedRequestContext) {
  const { request, user } = context
  try {
    if (!user.humanAid) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "Human profile not found" },
        { status: 404 }
      )
    }

    const url = new URL(request.url)
    const { filters, orders, pagination } = parseQueryParams(url)
    filters.conditions?.push({ field: "humanHaid", operator: "eq", values: [user.humanAid] })

    const messageThreadsRepository = MessageThreadsRepository.getInstance()
    const messagesRepository = MessagesRepository.getInstance()
    const result = await messageThreadsRepository.getFilteredSupportChats(filters, orders, pagination)

    const chatsWithParsedData = await Promise.all(
      result.docs.map(async (chat) => {
        let parsedDataIn: altrpSupportChatDataIn | null = null
        if (chat.dataIn) {
          try {
            parsedDataIn =
              typeof chat.dataIn === "string" ? (JSON.parse(chat.dataIn) as altrpSupportChatDataIn) : (chat.dataIn as altrpSupportChatDataIn)
          } catch {
            // ignore
          }
        }
        const hasUnreadMessages = await messagesRepository.hasUnreadAdminMessages(chat.maid)
        return {
          ...chat,
          dataIn: parsedDataIn || { humanHaid: user.humanAid },
          type: "SUPPORT" as const,
          hasUnreadMessages,
        } as altrpSupportChat & { hasUnreadMessages: boolean }
      })
    )

    return NextResponse.json({ docs: chatsWithParsedData, pagination: result.pagination })
  } catch (error) {
    console.error("[GET /api/altrp/v1/t/support]", error)
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    )
  }
}

async function handlePost(context: AuthenticatedRequestContext) {
  const { request, user } = context
  const env = buildRequestEnv()

  try {
    if (!user.humanAid) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "Human profile not found" },
        { status: 404 }
      )
    }

    const body = (await request.json()) as { subject: string; message?: string }
    const { subject, message } = body

    if (!subject || typeof subject !== "string" || subject.trim() === "") {
      return NextResponse.json(
        { success: false, error: "INVALID_REQUEST", message: "Subject is required" },
        { status: 400 }
      )
    }

    const messageThreadsRepository = MessageThreadsRepository.getInstance()
    const chat = await messageThreadsRepository.startNewSupportChat(user.humanAid, subject.trim(), env)

    if (message && typeof message === "string" && message.trim() !== "") {
      try {
        await messageThreadsRepository.addMessageToSupportChat(chat.maid, message.trim(), "text", user.humanAid, "client")
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ success: true, message: "Support chat created", data: chat }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/altrp/v1/t/support]", error)
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    )
  }
}

export const GET = withTesterGuard(handleGet)
export const POST = withTesterGuard(handlePost)
