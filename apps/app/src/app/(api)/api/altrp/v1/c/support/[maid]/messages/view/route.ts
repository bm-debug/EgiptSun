import { NextRequest, NextResponse } from 'next/server'
import { withClientGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { MessageThreadsRepository } from '@/shared/repositories/message-threads.repository'
import { MessagesRepository } from '@/shared/repositories/messages.repository'
import { altrpSupportChatDataIn } from '@/shared/types/altrp-support'

const handlePost = async (
  context: AuthenticatedRequestContext,
  maid: string
) => {
  const { user } = context

  try {
    if (!user.humanAid) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Human profile not found',
        },
        { status: 404 }
      )
    }

    const messageThreadsRepository = MessageThreadsRepository.getInstance()
    const messagesRepository = MessagesRepository.getInstance()

    const chat = await messageThreadsRepository.findByMaid(maid)
    if (!chat) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Support chat not found',
        },
        { status: 404 }
      )
    }

    if (chat.type !== 'SUPPORT') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Chat is not a support chat',
        },
        { status: 400 }
      )
    }

    if (chat.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Support chat not found',
        },
        { status: 404 }
      )
    }

    let chatDataIn: altrpSupportChatDataIn | null = null
    if (chat.dataIn) {
      try {
        chatDataIn = typeof chat.dataIn === 'string'
          ? (JSON.parse(chat.dataIn) as altrpSupportChatDataIn)
          : (chat.dataIn as altrpSupportChatDataIn)
      } catch (error) {
        console.error('Failed to parse chat dataIn', error)
      }
    }

    if (!chatDataIn || chatDataIn.humanHaid !== user.humanAid) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Access denied: chat does not belong to you',
        },
        { status: 403 }
      )
    }

    const updatedCount = await messagesRepository.markMessagesViewed(maid, 'client')

    return NextResponse.json({
      success: true,
      data: { updated: updatedCount },
    })
  } catch (error) {
    console.error('Failed to mark messages as viewed', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message,
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ maid: string }> }
) {
  const params = await context.params
  return withClientGuard((ctx: AuthenticatedRequestContext) => handlePost(ctx, params.maid))(
    request,
    { params: Promise.resolve(params) }
  )
}


