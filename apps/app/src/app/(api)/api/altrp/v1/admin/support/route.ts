import { NextRequest, NextResponse } from 'next/server'
import { MessageThreadsRepository } from '@/shared/repositories/message-threads.repository'
import { MessagesRepository } from '@/shared/repositories/messages.repository'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { altrpSupportChat, altrpSupportChatDataIn, altrpSupportMessageType } from '@/shared/types/altrp-support'
import type { DbFilters, DbOrders, DbPagination } from '@/shared/types/shared'
import { FileStorageService } from '@/shared/services/storage/file-storage.service'

const parseQueryParams = (url: URL): { filters: DbFilters; orders: DbOrders; pagination: DbPagination } => {
  const filters: DbFilters = { conditions: [] }
  const orders: DbOrders = { orders: [] }
  const pagination: DbPagination = {}

  // Parse pagination
  const page = url.searchParams.get('page')
  const limit = url.searchParams.get('limit')
  if (page) pagination.page = parseInt(page, 10)
  if (limit) pagination.limit = parseInt(limit, 10)

  // Parse search filter (search by title)
  const search = url.searchParams.get('search')
  if (search) {
    filters.conditions?.push({
      field: 'title',
      operator: 'like',
      values: [`%${search}%`],
    })
  }

  // Parse status filter
  const status = url.searchParams.get('status')
  if (status) {
    filters.conditions?.push({
      field: 'statusName',
      operator: 'eq',
      values: [status],
    })
  }

  // Parse manager filter (by managerHaid in dataIn)
  // This will be handled in the repository method
  const managerHaid = url.searchParams.get('managerHaid')
  if (managerHaid) {
    // Store in filters for custom processing in repository
    filters.conditions?.push({
      field: 'managerHaid',
      operator: 'eq',
      values: [managerHaid],
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
  const { request } = context
  try {
    const url = new URL(request.url)
    const { filters, orders, pagination } = parseQueryParams(url)

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

        // Check if chat has unread messages from clients
        const hasUnreadMessages = await messagesRepository.hasUnreadClientMessages(chat.maid)

        return {
          ...chat,
          dataIn: parsedDataIn || { humanHaid: '' },
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
  try {
    // Get admin's human haid
    if (!user.humanAid) {
      return NextResponse.json({ 
        success: false,
        error: 'INVALID_USER',
        message: 'Admin user must have human profile' 
      }, { status: 400 })
    }

    // Parse FormData (supports both text and photo messages)
    const formData = await request.formData()
    const chatMaid = formData.get('chatMaid') as string | null
    const content = formData.get('content') as string | null
    const messageType = (formData.get('messageType') as altrpSupportMessageType | null) || 'text'
    const file = formData.get('file') as File | null

    // Validate required fields
    if (!chatMaid || typeof chatMaid !== 'string') {
      return NextResponse.json({ 
        success: false,
        error: 'INVALID_REQUEST',
        message: 'chatMaid is required' 
      }, { status: 400 })
    }

    // Validate message type
    const allowedMessageTypes: altrpSupportMessageType[] = ['text', 'photo']
    if (!allowedMessageTypes.includes(messageType)) {
      return NextResponse.json({ 
        success: false,
        error: 'INVALID_REQUEST',
        message: `messageType must be one of: ${allowedMessageTypes.join(', ')}`,
      }, { status: 400 })
    }

    // For text messages, content is required
    if (messageType === 'text') {
      if (!content || typeof content !== 'string' || content.trim() === '') {
        return NextResponse.json({ 
          success: false,
          error: 'INVALID_REQUEST',
          message: 'content is required for text messages' 
        }, { status: 400 })
      }
    }

    // For photo messages, file is required
    if (messageType === 'photo') {
      if (!file) {
        return NextResponse.json({ 
          success: false,
          error: 'INVALID_REQUEST',
          message: 'file is required for photo messages' 
        }, { status: 400 })
      }

      // Validate file type (only images allowed)
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedMimeTypes.includes(file.type)) {
        return NextResponse.json({ 
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Only image files are allowed (JPG, PNG, WebP)' 
        }, { status: 400 })
      }
    }

    const messageThreadsRepository = MessageThreadsRepository.getInstance()
    
    // Verify chat exists
    const chat = await messageThreadsRepository.findByMaid(chatMaid)
    if (!chat) {
      return NextResponse.json({ 
        success: false,
        error: 'NOT_FOUND',
        message: 'Support chat not found' 
      }, { status: 404 })
    }

    // Verify it's a support chat
    if (chat.type !== 'SUPPORT') {
      return NextResponse.json({ 
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Chat is not a support chat' 
      }, { status: 400 })
    }

    // Verify chat is not deleted
    if (chat.deletedAt) {
      return NextResponse.json({ 
        success: false,
        error: 'NOT_FOUND',
        message: 'Support chat not found' 
      }, { status: 404 })
    }

    let messageContent = content?.trim() || ''
    let mediaUuid: string | undefined

    // Handle photo upload if message type is photo
    if (messageType === 'photo' && file) {
      const fileStorageService = FileStorageService.getInstance()
      
      // Upload file
      const media = await fileStorageService.uploadFile(
        file,
        chat.uuid, // entityUuid - chat UUID
        file.name,
        user.humanAid // uploaderAid
      )

      mediaUuid = media.uuid
      
      // If no content provided, use filename as content
      if (!messageContent) {
        messageContent = file.name
      }
    }

    // Add message to chat
    const message = await messageThreadsRepository.addMessageToSupportChat(
      chatMaid,
      messageContent,
      messageType,
      user.humanAid,
      'admin',
      mediaUuid
    )

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to send message to support chat', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message,
    }, { status: 500 })
  }
}

export const GET = withAdminGuard(handleGet)
export const POST = withAdminGuard(handlePost)

