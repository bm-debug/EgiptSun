import { NextRequest, NextResponse } from 'next/server'
import { MessageThreadsRepository } from '@/shared/repositories/message-threads.repository'
import { withClientGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { altrpSupportMessageType } from '@/shared/types/altrp-support'
import { FileStorageService } from '@/shared/services/storage/file-storage.service'

const handlePost = async (context: AuthenticatedRequestContext) => {
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
        message: 'chatMaid is required',
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
          message: 'content is required for text messages',
        }, { status: 400 })
      }
    }

    // For photo messages, file is required
    if (messageType === 'photo') {
      if (!file) {
        return NextResponse.json({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'file is required for photo messages',
        }, { status: 400 })
      }

      // Validate file type (only images allowed)
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedMimeTypes.includes(file.type)) {
        return NextResponse.json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Only image files are allowed (JPG, PNG, WebP)',
        }, { status: 400 })
      }
    }

    const messageThreadsRepository = MessageThreadsRepository.getInstance()

    // Verify chat exists and belongs to the client
    const chat = await messageThreadsRepository.findByMaid(chatMaid)
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
    let chatDataIn: any = {}
    if (chat.dataIn) {
      try {
        chatDataIn = typeof chat.dataIn === 'string'
          ? JSON.parse(chat.dataIn)
          : chat.dataIn
      } catch (error) {
        console.error('Failed to parse chat dataIn', error)
      }
    }

    if (chatDataIn.humanHaid !== user.humanAid) {
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
      'client',
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

export const POST = withClientGuard(handlePost)

