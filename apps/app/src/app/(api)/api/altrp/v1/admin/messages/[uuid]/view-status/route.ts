import { NextRequest, NextResponse } from 'next/server'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { MessagesRepository } from '@/shared/repositories/messages.repository'
import { parseJson } from '@/shared/repositories/utils'
import type { altrpSupportMessageDataIn } from '@/shared/types/altrp-support'

const handleGet = async (
  context: AuthenticatedRequestContext,
  messageUuid: string
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

    const messagesRepository = MessagesRepository.getInstance()
    const message = await messagesRepository.findByUuid(messageUuid)

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Message not found',
        },
        { status: 404 }
      )
    }

    // Parse dataIn
    const dataIn = parseJson<altrpSupportMessageDataIn | Record<string, unknown>>(
      (message as any).dataIn,
      {} as altrpSupportMessageDataIn
    )

    // Check that message was sent by current user
    if ((dataIn as any).humanHaid !== user.humanAid) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Access denied: message does not belong to you',
        },
        { status: 403 }
      )
    }

    // Return view status
    return NextResponse.json({
      success: true,
      data: {
        client_viewed_at: (dataIn as any).client_viewed_at || null,
        admin_viewed_at: (dataIn as any).admin_viewed_at || null,
      },
    })
  } catch (error) {
    console.error('Failed to get message view status', error)
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> }
) {
  const params = await context.params
  return withAdminGuard((ctx: AuthenticatedRequestContext) =>
    handleGet(ctx, params.uuid)
  )(request, { params: Promise.resolve(params) })
}

