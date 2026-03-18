import { NextRequest, NextResponse } from 'next/server'
import { MessageThreadsRepository } from '@/shared/repositories/message-threads.repository'
import { withClientGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { altrpSupportChatDataIn } from '@/shared/types/altrp-support'

const handlePatch = async (
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

    const body = await request.json() as {
      statusName: 'OPEN' | 'CLOSED'
    }

    const { statusName } = body

    // Validate status
    if (!statusName || !['OPEN', 'CLOSED'].includes(statusName)) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'statusName must be OPEN or CLOSED',
      }, { status: 400 })
    }

    const messageThreadsRepository = MessageThreadsRepository.getInstance()

    // Get chat by maid
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

    // Update chat status
    const updatedChat = await messageThreadsRepository.update(chat.uuid, {
      statusName,
    } as any)

    return NextResponse.json({
      success: true,
      message: 'Chat status updated successfully',
      data: updatedChat,
    })
  } catch (error) {
    console.error('Failed to update chat status', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message,
    }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ maid: string }> }
) {
  const params = await context.params
  return withClientGuard(async (ctx: AuthenticatedRequestContext) => {
    return handlePatch(ctx, params.maid)
  })(request, { params: Promise.resolve(params) })
}

