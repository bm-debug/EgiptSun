import { NextRequest, NextResponse } from 'next/server'
import { withAdminGuard, type AuthenticatedRequestContext } from '@/shared/api-guard'
import { GoalsRepository } from '@/shared/repositories/goals.repository'
import { MessagesRepository } from '@/shared/repositories/messages.repository'
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
    const after = url.searchParams.get('after')
    if (!after) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: '`after` is required' },
        { status: 400, headers: jsonHeaders }
      )
    }

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

    const messages = await messagesRepository.findNewMessagesAfterTimestamp(
      dataIn.taskThreadMaid,
      after,
      50
    )

    const parsed = messages.map((msg) => ({
      ...msg,
      dataIn: parseJson<altrpSupportMessageDataIn | Record<string, unknown>>(
        (msg as any).dataIn,
        {} as altrpSupportMessageDataIn
      ),
    }))

    return NextResponse.json(
      {
        success: true,
        data: { messages: parsed },
      },
      { status: 200, headers: jsonHeaders }
    )
  } catch (error) {
    console.error('Failed to fetch new task messages', error)
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

