import { NextResponse } from "next/server"
import { MessageThreadsRepository } from "@/shared/repositories/message-threads.repository"
import { withTesterGuard, AuthenticatedRequestContext } from "@/shared/api-guard"
import { altrpSupportMessageType } from "@/shared/types/altrp-support"

async function handlePost(context: AuthenticatedRequestContext) {
  const { request, user } = context

  try {
    if (!user.humanAid) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "Human profile not found" },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const chatMaid = formData.get("chatMaid") as string | null
    const content = (formData.get("content") as string | null) || ""
    const messageType = ((formData.get("messageType") as altrpSupportMessageType | null) || "text") as "text" | "photo"

    if (!chatMaid || typeof chatMaid !== "string") {
      return NextResponse.json(
        { success: false, error: "INVALID_REQUEST", message: "chatMaid is required" },
        { status: 400 }
      )
    }

    if (messageType === "text" && (!content || content.trim() === "")) {
      return NextResponse.json(
        { success: false, error: "INVALID_REQUEST", message: "content is required" },
        { status: 400 }
      )
    }

    const messageThreadsRepository = MessageThreadsRepository.getInstance()
    const chat = await messageThreadsRepository.findByMaid(chatMaid)

    if (!chat || chat.type !== "SUPPORT" || chat.deletedAt) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "Support chat not found" },
        { status: 404 }
      )
    }

    let chatDataIn: any = {}
    if (chat.dataIn) {
      try {
        chatDataIn = typeof chat.dataIn === "string" ? JSON.parse(chat.dataIn) : chat.dataIn
      } catch {
        // ignore
      }
    }

    if (chatDataIn.humanHaid !== user.humanAid) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Access denied" },
        { status: 403 }
      )
    }

    const msg = await messageThreadsRepository.addMessageToSupportChat(
      chatMaid,
      content.trim() || " ",
      messageType,
      user.humanAid,
      "client"
    )

    return NextResponse.json({ success: true, data: msg }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/altrp/v1/t/support/messages]", error)
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    )
  }
}

export const POST = withTesterGuard(handlePost)
