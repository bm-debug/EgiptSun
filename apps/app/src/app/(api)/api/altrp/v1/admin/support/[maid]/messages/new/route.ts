import { NextRequest, NextResponse } from 'next/server'
import { MessagesRepository } from '@/shared/repositories/messages.repository'
import { MessageThreadsRepository } from '@/shared/repositories/message-threads.repository'
import { HumanRepository } from '@/shared/repositories/human.repository'
import { UsersRepository } from '@/shared/repositories/users.repository'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'

const handleGet = async (
  context: AuthenticatedRequestContext,
  maid: string
) => {
  const { request } = context

  try {
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
    const humanRepository = HumanRepository.getInstance()
    const usersRepository = UsersRepository.getInstance()

    // Verify chat exists
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

    // Parse dataIn for each message and load human data
    const parsedMessages = await Promise.all(
      newMessages.map(async (msg) => {
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

        // Load human data if humanHaid exists
        let humanDisplayName: string | null = null
        let humanHaid: string | null = null
        let userUuid: string | null = null
        if (parsedDataIn?.humanHaid) {
          try {
            humanHaid = parsedDataIn.humanHaid
            const human = await humanRepository.findByHaid(parsedDataIn.humanHaid)
            if (human) {
              // Parse dataIn to get firstName, lastName
              let humanDataIn: any = {}
              if (human.dataIn) {
                try {
                  humanDataIn = typeof human.dataIn === 'string'
                    ? JSON.parse(human.dataIn)
                    : human.dataIn
                } catch (error) {
                  console.error('Failed to parse human dataIn', error)
                }
              }

              // Priority: firstName + lastName > email > fullName
              if (humanDataIn?.firstName && humanDataIn?.lastName) {
                humanDisplayName = `${humanDataIn.firstName} ${humanDataIn.lastName}`.trim()
              } else if (human.email) {
                humanDisplayName = human.email
              } else if (human.fullName) {
                humanDisplayName = human.fullName
              }
            }
            
            // Get userUuid by humanHaid
            try {
              const user = await usersRepository.findByHumanAid(parsedDataIn.humanHaid)
              if (user) {
                userUuid = user.uuid
              }
            } catch (error) {
              console.error('Failed to load user data', error)
            }
          } catch (error) {
            console.error('Failed to load human data', error)
          }
        }

        return {
          ...msg,
          dataIn: parsedDataIn,
          humanDisplayName,
          humanHaid,
          userUuid,
        }
      })
    )

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
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handleGet(ctx, params.maid)
  })(request, { params: Promise.resolve(params) })
}

