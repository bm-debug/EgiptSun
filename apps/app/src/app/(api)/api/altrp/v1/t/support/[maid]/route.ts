import { NextRequest, NextResponse } from "next/server"
import { MessageThreadsRepository } from "@/shared/repositories/message-threads.repository"
import { MessagesRepository } from "@/shared/repositories/messages.repository"
import { withTesterGuard, AuthenticatedRequestContext } from "@/shared/api-guard"
import { altrpSupportChat, altrpSupportChatDataIn } from "@/shared/types/altrp-support"

async function handleGet(context: AuthenticatedRequestContext, maid: string) {
  const { user } = context

  try {
    if (!user.humanAid) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "Human profile not found" },
        { status: 404 }
      )
    }

    const messageThreadsRepository = MessageThreadsRepository.getInstance()
    const messagesRepository = MessagesRepository.getInstance()

    const chat = await messageThreadsRepository.findByMaid(maid)
    if (!chat) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "Support chat not found" },
        { status: 404 }
      )
    }

    if (chat.type !== "SUPPORT") {
      return NextResponse.json(
        { success: false, error: "INVALID_REQUEST", message: "Chat is not a support chat" },
        { status: 400 }
      )
    }

    let chatDataIn: altrpSupportChatDataIn | null = null
    if (chat.dataIn) {
      try {
        chatDataIn =
          typeof chat.dataIn === "string" ? (JSON.parse(chat.dataIn) as altrpSupportChatDataIn) : (chat.dataIn as altrpSupportChatDataIn)
      } catch {
        // ignore
      }
    }

    if (!chatDataIn || chatDataIn.humanHaid !== user.humanAid) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Access denied" },
        { status: 403 }
      )
    }

    if (chat.deletedAt) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "Support chat not found" },
        { status: 404 }
      )
    }

    const messages = await messagesRepository.findByChatMaid(maid)

    const parsedChat: altrpSupportChat = {
      ...chat,
      dataIn: chatDataIn || { humanHaid: user.humanAid },
      type: "SUPPORT" as const,
    }

    return NextResponse.json({
      success: true,
      data: {
        chat: parsedChat,
        messages: messages.map((msg) => {
          let parsedDataIn: any = {}
          if (msg.dataIn) {
            try {
              parsedDataIn = typeof msg.dataIn === "string" ? JSON.parse(msg.dataIn) : msg.dataIn
            } catch {
              // ignore
            }
          }
          return { ...msg, dataIn: parsedDataIn }
        }),
      },
    })
  } catch (error) {
    console.error("[GET /api/altrp/v1/t/support/[maid]]", error)
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ maid: string }> }) {
  const params = await context.params
  return withTesterGuard(async (ctx: AuthenticatedRequestContext) => handleGet(ctx, params.maid))(request, {
    params: Promise.resolve(params),
  })
}
