import { NextResponse } from 'next/server'
import { withClientGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { RelationsRepository } from '@/shared/repositories/relations.repository'
import { DealsRepository } from '@/shared/repositories/deals.repository'
import { HumanRepository } from '@/shared/repositories/human.repository'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { schema } from '@/shared/schema/schema'
import { createDb } from '@/shared/repositories/utils'
import type { GuarantorHuman } from '@/shared/types/altrp'

/**
 * GET /api/altrp/v1/c/guarantors
 * Returns list of existing guarantors from user's deals
 */
export const GET = withClientGuard(async (context: AuthenticatedRequestContext) => {
  try {
    const { human } = context.user

    if (!human?.haid) {
      return NextResponse.json({ error: 'Human profile not found' }, { status: 404 })
    }

    const db = createDb()
    const relationsRepository = RelationsRepository.getInstance()
    const dealsRepository = DealsRepository.getInstance()
    const humanRepository = HumanRepository.getInstance()

    // Get all deals for this user
    const userDeals = await dealsRepository.getDeals({
      filters: {
        conditions: [
          { field: 'clientAid', operator: 'eq', values: [human.haid] },
          { field: 'dataIn', operator: 'like', values: ['%"type":"LOAN_APPLICATION"%'] },
        ],
      },
      pagination: { page: 1, limit: 1000 },
    })

    if (userDeals.docs.length === 0) {
      return NextResponse.json({ success: true, guarantors: [] })
    }

    // Get all deal AIDs
    const dealAids = userDeals.docs.map((deal) => deal.daid).filter(Boolean) as string[]

    if (dealAids.length === 0) {
      return NextResponse.json({ success: true, guarantors: [] })
    }

    // Get all GUARANTOR relations for these deals
    const relations = await db
      .select()
      .from(schema.relations)
      .where(
        and(
          inArray(schema.relations.sourceEntity, dealAids),
          eq(schema.relations.type, 'GUARANTOR'),
          isNull(schema.relations.deletedAt)
        )
      )
      .execute()

    if (relations.length === 0) {
      return NextResponse.json({ success: true, guarantors: [] })
    }

    // Get unique target entity IDs (guarantor haids)
    const guarantorHaids = Array.from(new Set(relations.map((r) => r.targetEntity).filter(Boolean))) as string[]

    if (guarantorHaids.length === 0) {
      return NextResponse.json({ success: true, guarantors: [] })
    }

    // Get human records for guarantors
    const guarantors = await db
      .select()
      .from(schema.humans)
      .where(
        and(
          inArray(schema.humans.haid, guarantorHaids),
          isNull(schema.humans.deletedAt)
        )
      )
      .execute()

    // Map to GuarantorHuman format
    const guarantorHumans: GuarantorHuman[] = guarantors.map((guarantor) => {
      const dataIn =
        typeof guarantor.dataIn === 'string'
          ? JSON.parse(guarantor.dataIn)
          : guarantor.dataIn || {}

      return {
        ...guarantor,
        dataIn: {
          ...dataIn,
          phone: dataIn.phone || '',
        },
      } as GuarantorHuman
    })

    return NextResponse.json({
      success: true,
      guarantors: guarantorHumans,
    })
  } catch (error) {
    console.error('Get guarantors error:', error)
    return NextResponse.json(
      { error: 'Failed to get guarantors', details: String(error) },
      { status: 500 }
    )
  }
})

/**
 * POST /api/altrp/v1/c/guarantors
 * Creates or updates a guarantor human by phone
 */
export const POST = withClientGuard(async (context: AuthenticatedRequestContext) => {
  try {
    const body = (await context.request.json()) as {
      fullName?: string
      phone?: string
      relationship?: string
      income?: string
    }

    const fullName = (body.fullName || '').trim()
    const phone = (body.phone || '').trim()
    const relationship = (body.relationship || '').trim()
    const income = (body.income || '').trim()

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'phone обязателен' },
        { status: 400 }
      )
    }

    const humanRepository = HumanRepository.getInstance()
    const existing = await humanRepository.findByPhoneInDataIn(phone)

    if (existing) {
      const existingDataIn =
        typeof existing.dataIn === 'string'
          ? (JSON.parse(existing.dataIn) as Record<string, unknown>)
          : (existing.dataIn as Record<string, unknown>) || {}

      const mergedDataIn: Record<string, unknown> = {
        ...existingDataIn,
        phone,
        ...(fullName && !existingDataIn.fullName ? { fullName } : {}),
        guarantor: true,
      }

      const updated = await humanRepository.update(existing.uuid, {
        fullName: fullName || existing.fullName,
        dataIn: mergedDataIn,
        type: existing.type || 'GUARANTOR',
        statusName: existing.statusName || 'PENDING',
      })

      return NextResponse.json({
        success: true,
        guarantor: {
          haid: updated.haid,
          fullName: updated.fullName,
          dataIn: mergedDataIn,
          relationDataIn: {
            guarantorFullName: fullName || updated.fullName,
            guarantorPhone: phone,
            ...(relationship && { guarantorRelationship: relationship }),
            ...(income && { guarantorIncome: income }),
          },
        },
      })
    }

    const created = await humanRepository.create({
      fullName: fullName || phone,
      type: 'GUARANTOR',
      statusName: 'PENDING',
      dataIn: {
        phone,
        ...(fullName && { fullName }),
        guarantor: true,
      },
    })

    return NextResponse.json({
      success: true,
      guarantor: {
        haid: created.haid,
        fullName: created.fullName,
        dataIn: created.dataIn,
        relationDataIn: {
          guarantorFullName: fullName || created.fullName,
          guarantorPhone: phone,
          ...(relationship && { guarantorRelationship: relationship }),
          ...(income && { guarantorIncome: income }),
        },
      },
    })
  } catch (error) {
    console.error('Create guarantor error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create guarantor', details: String(error) },
      { status: 500 }
    )
  }
})

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

