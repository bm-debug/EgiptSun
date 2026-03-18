import { NextRequest, NextResponse } from 'next/server'
import { withAdminGuard, type AuthenticatedRequestContext } from '@/shared/api-guard'
import { GoalsRepository } from '@/shared/repositories/goals.repository'
import { MessageThreadsRepository } from '@/shared/repositories/message-threads.repository'
import { MessagesRepository } from '@/shared/repositories/messages.repository'
import { FileStorageService } from '@/shared/services/storage/file-storage.service'
import { parseJson } from '@/shared/repositories/utils'
import type { AdminTaskDataIn } from '@/shared/types/tasks'
import type { altrpSupportMessageDataIn } from '@/shared/types/altrp-support'

const jsonHeaders = { 'content-type': 'application/json' }

const handleGet = async (
  context: AuthenticatedRequestContext,
  taskUuid: string
) => {
  const { request } = context
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)

    const goalsRepository = GoalsRepository.getInstance()
    const messagesRepository = MessagesRepository.getInstance()

    const task = await goalsRepository.findAdminTaskByUuid(taskUuid)
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Task not found' },
        { status: 404, headers: jsonHeaders }
      )
    }

    const dataIn = parseJson<AdminTaskDataIn>((task as any).dataIn, {})
    if (!dataIn.taskThreadMaid) {
      return NextResponse.json(
        { success: false, error: 'INVALID_STATE', message: 'Task thread is missing' },
        { status: 400, headers: jsonHeaders }
      )
    }

    const result = await messagesRepository.findByChatMaidPaginated(dataIn.taskThreadMaid, page, limit)
    const parsedMessages = await Promise.all(
      result.messages.map(async (msg) => {
        const parsed = parseJson<altrpSupportMessageDataIn | Record<string, unknown>>(
          (msg as any).dataIn,
          {} as altrpSupportMessageDataIn
        )
        return { ...msg, dataIn: parsed }
      })
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          messages: parsedMessages,
          pagination: {
            total: result.total,
            hasMore: result.hasMore,
            page,
            limit,
          },
        },
      },
      { status: 200, headers: jsonHeaders }
    )
  } catch (error) {
    console.error('Failed to fetch task messages', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500, headers: jsonHeaders }
    )
  }
}

const handlePost = async (
  context: AuthenticatedRequestContext,
  taskUuid: string
) => {
  const { request, user } = context
  try {
    if (!user.humanAid) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'User humanHaid is required' },
        { status: 400, headers: jsonHeaders }
      )
    }

    const formData = await request.formData()
    const content = (formData.get('content') as string | null)?.trim() || ''
    const messageType = (formData.get('messageType') as 'text' | 'photo' | null) || 'text'
    const file = formData.get('file') as File | null

    if (messageType === 'text' && !content) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Content is required' },
        { status: 400, headers: jsonHeaders }
      )
    }

    if (messageType === 'photo') {
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'VALIDATION_ERROR', message: 'File is required for photo message' },
          { status: 400, headers: jsonHeaders }
        )
      }
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedMimeTypes.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: 'VALIDATION_ERROR', message: 'Only image files are allowed' },
          { status: 400, headers: jsonHeaders }
        )
      }
    }

    const goalsRepository = GoalsRepository.getInstance()
    const messageThreadsRepository = MessageThreadsRepository.getInstance()
    const messagesRepository = MessagesRepository.getInstance()
    const fileStorageService = FileStorageService.getInstance()

    const task = await goalsRepository.findAdminTaskByUuid(taskUuid)
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Task not found' },
        { status: 404, headers: jsonHeaders }
      )
    }

    const dataIn = parseJson<AdminTaskDataIn>((task as any).dataIn, {})
    if (!dataIn.taskThreadMaid) {
      return NextResponse.json(
        { success: false, error: 'INVALID_STATE', message: 'Task thread is missing' },
        { status: 400, headers: jsonHeaders }
      )
    }

    const thread = await messageThreadsRepository.findByMaid(dataIn.taskThreadMaid)
    if (!thread) {
      return NextResponse.json(
        { success: false, error: 'INVALID_STATE', message: 'Task thread not found' },
        { status: 404, headers: jsonHeaders }
      )
    }

    let mediaUuid: string | undefined
    let mediaUrl: string | undefined
    let messageContent = content

    if (messageType === 'photo' && file) {
      const media = await fileStorageService.uploadFile(
        file,
        thread.uuid,
        file.name,
        user.humanAid,
        true
      )
      mediaUuid = media.uuid
      mediaUrl = media.url
      if (!messageContent) {
        messageContent = file.name
      }
    }

    const message = await messageThreadsRepository.addMessageToTaskThread(
      dataIn.taskThreadMaid,
      messageContent,
      messageType,
      user.humanAid,
      mediaUuid,
      mediaUrl
    )

    const parsed = {
      ...message,
      dataIn: parseJson<altrpSupportMessageDataIn | Record<string, unknown>>(
        (message as any).dataIn,
        {} as altrpSupportMessageDataIn
      ),
    }

    return NextResponse.json(
      {
        success: true,
        message: parsed,
      },
      { status: 201, headers: jsonHeaders }
    )
  } catch (error) {
    console.error('Failed to send task message', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500, headers: jsonHeaders }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> }
) {
  const params = await context.params
  return withAdminGuard((ctx: AuthenticatedRequestContext) => handleGet(ctx, params.uuid))(request, {
    params: Promise.resolve(params),
  })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> }
) {
  const params = await context.params
  return withAdminGuard((ctx: AuthenticatedRequestContext) => handlePost(ctx, params.uuid))(request, {
    params: Promise.resolve(params),
  })
}

