import { NextRequest, NextResponse } from 'next/server'
import { MessageThreadsRepository } from '@/shared/repositories/message-threads.repository'
import { MessagesRepository } from '@/shared/repositories/messages.repository'
import { withClientGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { altrpSupportChat, altrpSupportChatDataIn } from '@/shared/types/altrp-support'
import type { DbFilters, DbOrders, DbPagination } from '@/shared/types/shared'
import { buildRequestEnv } from '@/shared/env'

const parseQueryParams = (url: URL): { filters: DbFilters; orders: DbOrders; pagination: DbPagination } => {
  const filters: DbFilters = { conditions: [] }
  const orders: DbOrders = { orders: [] }
  const pagination: DbPagination = {}

  // Parse pagination
  const page = url.searchParams.get('page')
  const limit = url.searchParams.get('limit')
  if (page) pagination.page = parseInt(page, 10)
  if (limit) pagination.limit = parseInt(limit, 10)

  // Parse status filter
  const status = url.searchParams.get('status')
  if (status) {
    filters.conditions?.push({
      field: 'statusName',
      operator: 'eq',
      values: [status],
    })
  }

  // Parse orders (example: ?orderBy=createdAt&orderDirection=desc)
  const orderBy = url.searchParams.get('orderBy')
  const orderDirection = url.searchParams.get('orderDirection') as 'asc' | 'desc' | null
  if (orderBy && orderDirection) {
    orders.orders?.push({
      field: orderBy,
      direction: orderDirection,
    })
  } else {
    // Default order by updatedAt desc (most recently updated chats first)
    orders.orders?.push({
      field: 'updatedAt',
      direction: 'desc',
    })
  }

  // Always exclude soft-deleted records
  filters.conditions?.push({
    field: 'deletedAt',
    operator: 'isNull',
    values: [],
  })

  return { filters, orders, pagination }
}

const handleGet = async (context: AuthenticatedRequestContext) => {
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
    const { filters, orders, pagination } = parseQueryParams(url)

    // Add filter for current client's humanHaid
    filters.conditions?.push({
      field: 'humanHaid',
      operator: 'eq',
      values: [user.humanAid],
    })

    const messageThreadsRepository = MessageThreadsRepository.getInstance()
    const messagesRepository = MessagesRepository.getInstance()
    const result = await messageThreadsRepository.getFilteredSupportChats(filters, orders, pagination)

    // Parse dataIn for each chat and check for unread messages
    const chatsWithParsedData = await Promise.all(
      result.docs.map(async (chat) => {
        let parsedDataIn: altrpSupportChatDataIn | null = null
        if (chat.dataIn) {
          try {
            if (typeof chat.dataIn === 'string') {
              parsedDataIn = JSON.parse(chat.dataIn) as altrpSupportChatDataIn
            } else {
              parsedDataIn = chat.dataIn as altrpSupportChatDataIn
            }
          } catch (error) {
            console.error('Failed to parse dataIn for chat', chat.maid, error)
          }
        }

        // Check if chat has unread messages from admin
        const hasUnreadMessages = await messagesRepository.hasUnreadAdminMessages(chat.maid)

        return {
          ...chat,
          dataIn: parsedDataIn || { humanHaid: user.humanAid },
          type: 'SUPPORT' as const,
          hasUnreadMessages,
        } as altrpSupportChat & { hasUnreadMessages: boolean }
      })
    )

    return NextResponse.json({
      docs: chatsWithParsedData,
      pagination: result.pagination,
    })
  } catch (error) {
    console.error('Failed to fetch support chats', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message,
    }, { status: 500 })
  }
}

const handlePost = async (context: AuthenticatedRequestContext) => {
  const { request, user } = context
  const env = buildRequestEnv()

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
      subject: string
      message?: string
    }

    const { subject, message } = body

    // Validate required fields
    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Subject is required',
      }, { status: 400 })
    }

    const messageThreadsRepository = MessageThreadsRepository.getInstance()
    
    // Create new support chat
    const chat = await messageThreadsRepository.startNewSupportChat(
      user.humanAid,
      subject.trim(),
      env
    )

    // If message is provided, add it as the first message in the chat
    if (message && typeof message === 'string' && message.trim() !== '') {
      try {
        await messageThreadsRepository.addMessageToSupportChat(
          chat.maid,
          message.trim(),
          'text',
          user.humanAid,
          'client'
        )
      } catch (messageError) {
        console.error('Failed to add initial message to chat', messageError)
        // Don't fail chat creation if message creation fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Support chat created successfully',
      data: chat,
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create support chat', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message,
    }, { status: 500 })
  }
}

export const GET = withClientGuard(handleGet)
export const POST = withClientGuard(handlePost)
