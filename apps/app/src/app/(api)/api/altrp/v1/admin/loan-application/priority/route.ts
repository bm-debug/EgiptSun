import { NextRequest, NextResponse } from 'next/server'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { DealsRepository } from '@/shared/repositories/deals.repository'
import type { LoanApplication, LoanApplicationDataIn } from '@/shared/types/altrp'

interface UpdatePriorityRequest {
  uuid: string
  priority: 'low' | 'medium' | 'high'
  priorityReason?: string
}

const handlePut = async (
  context: AuthenticatedRequestContext,
  request: NextRequest
) => {
  const { user: currentUser } = context
  
  try {
    const body = await request.json() as UpdatePriorityRequest
    const { uuid, priority, priorityReason } = body

    // Validate priority value
    if (!['low', 'medium', 'high'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value. Must be low, medium, or high' },
        { status: 400 }
      )
    }

    // Validate priorityReason length if provided
    if (priorityReason && priorityReason.length > 500) {
      return NextResponse.json(
        { error: 'Priority reason must be 500 characters or less' },
        { status: 400 }
      )
    }

    const dealsRepository = DealsRepository.getInstance()
    const existingDeal = await dealsRepository.findByUuid(uuid) as LoanApplication | undefined

    if (!existingDeal) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }

    // Get current dataIn and parse it
    let currentDataIn: LoanApplicationDataIn
    if (typeof existingDeal.dataIn === 'string') {
      try {
        currentDataIn = JSON.parse(existingDeal.dataIn) as LoanApplicationDataIn
      } catch {
        return NextResponse.json(
          { error: 'Invalid dataIn format' },
          { status: 400 }
        )
      }
    } else {
      currentDataIn = existingDeal.dataIn as LoanApplicationDataIn
    }
    
    // Update priority fields
    const updatedDataIn: LoanApplicationDataIn = {
      ...currentDataIn,
      priority,
      priorityReason: priorityReason?.trim() || undefined,
      priorityUpdatedAt: new Date().toISOString(),
      priorityUpdatedByUserUuid: currentUser.uuid,
    }

    // Update deal
    const result = await dealsRepository.updateLoanApplicationDeal(uuid, {
      dataIn: updatedDataIn,
    })

    // Log priority change (optional - can be added to journals if needed)
    console.log('Deal priority updated', {
      dealUuid: uuid,
      oldPriority: currentDataIn.priority || 'not_set',
      newPriority: priority,
      updatedBy: currentUser.uuid,
    })

    return NextResponse.json({
      success: true,
      deal: result.updatedDeal,
      message: 'Приоритет успешно обновлен',
    })
  } catch (error) {
    console.error('Failed to update deal priority', error)
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

export async function PUT(
  request: NextRequest
) {
  return withAdminGuard(async (context: AuthenticatedRequestContext) => {
    return handlePut(context, request)
  })(request)
}
