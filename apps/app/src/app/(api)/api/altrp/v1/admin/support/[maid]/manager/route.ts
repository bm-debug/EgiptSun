import { NextRequest, NextResponse } from 'next/server'
import { MessageThreadsRepository } from '@/shared/repositories/message-threads.repository'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { altrpSupportChat } from '@/shared/types/altrp-support'

const handlePatch = async (
  context: AuthenticatedRequestContext,
  maid: string
) => {
  try {
    const body = await context.request.json() as { managerHaid: string | null }
    const { managerHaid } = body

    if (managerHaid !== null && (typeof managerHaid !== 'string' || managerHaid.trim() === '')) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Invalid managerHaid provided. Must be a non-empty string or null.',
      }, { status: 400 })
    }

    const messageThreadsRepository = MessageThreadsRepository.getInstance()
    const updatedChat = await messageThreadsRepository.assignManager(maid, managerHaid)

    return NextResponse.json({
      success: true,
      message: managerHaid ? 'Ответственный назначен' : 'Ответственный снят',
      data: updatedChat,
    })
  } catch (error) {
    console.error('Failed to assign manager to admin support chat', error)
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
  const { maid } = await context.params;
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handlePatch(ctx, maid);
  })(request, context);
}

