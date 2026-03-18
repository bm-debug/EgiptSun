import { NextRequest, NextResponse } from 'next/server'
import { MessagesRepository } from '@/shared/repositories/messages.repository'
import { MessageThreadsRepository } from '@/shared/repositories/message-threads.repository'
import { withClientGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { altrpSupportChatDataIn } from '@/shared/types/altrp-support'

const handleGet = async (
  context: AuthenticatedRequestContext,
  maid: string
) => {
  const { request, user } = context

  try {
    // Get client's human haid
    if (!user.humanAid) {
      return NextResponse.json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Human profile not found',
      }, { status: 404 })
    }

    const url = new URL(request.url)
    const afterTimestamp = url.searchParams.get('after')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)

    if (!afterTimestamp) {
      return NextResponse.json({
        success: false,
        error: 'BAD_REQUEST',
        message: 'after parameter is required',
      }, { status: 400 })
    }

    const messageThreadsRepository = MessageThreadsRepository.getInstance()
    const messagesRepository = MessagesRepository.getInstance()

    // Verify chat exists and belongs to the client
    const chat = await messageThreadsRepository.findByMaid(maid)
    if (!chat) {
      return NextResponse.json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Support chat not found',
      }, { status: 404 })
    }

    // Verify it's a support chat
    if (chat.type !== 'SUPPORT') {
      return NextResponse.json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Chat is not a support chat',
      }, { status: 400 })
    }

    // Verify chat belongs to the current client
    let chatDataIn: altrpSupportChatDataIn | null = null
    if (chat.dataIn) {
      try {
        chatDataIn = typeof chat.dataIn === 'string'
          ? JSON.parse(chat.dataIn) as altrpSupportChatDataIn
          : chat.dataIn as altrpSupportChatDataIn
      } catch (error) {
        console.error('Failed to parse chat dataIn', error)
      }
    }

    if (!chatDataIn || chatDataIn.humanHaid !== user.humanAid) {
      return NextResponse.json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Access denied: chat does not belong to you',
      }, { status: 403 })
    }

    // Verify chat is not deleted
    if (chat.deletedAt) {
      return NextResponse.json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Support chat not found',
      }, { status: 404 })
    }

    // Get new messages after timestamp
    const newMessages = await messagesRepository.findNewMessagesAfterTimestamp(maid, afterTimestamp, limit)

    // Parse dataIn for each message
    const parsedMessages = newMessages.map((msg) => {
      let parsedDataIn: any = {}
      if (msg.dataIn) {
        try {
          parsedDataIn = typeof msg.dataIn === 'string'
            ? JSON.parse(msg.dataIn)
            : msg.dataIn
        } catch (error) {
          console.error('Failed to parse message dataIn', error)
        }
      }
      return {
        ...msg,
        dataIn: parsedDataIn,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        messages: parsedMessages,
      },
    })
  } catch (error) {
    console.error('Failed to fetch new messages', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message,
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ maid: string }> }
) {
  const params = await context.params
  return withClientGuard(async (ctx: AuthenticatedRequestContext) => {
    return handleGet(ctx, params.maid)
  })(request, { params: Promise.resolve(params) })
}

