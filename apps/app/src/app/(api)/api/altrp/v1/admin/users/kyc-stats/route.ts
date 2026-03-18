import { NextResponse } from 'next/server'
import { createDb } from '@/shared/repositories/utils'
import { schema } from '@/shared/schema'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'

/**
 * GET /api/altrp/v1/admin/users/kyc-stats
 * Returns count of users by KYC status
 */
const onRequestGet = async (context: AuthenticatedRequestContext) => {
  try {
    const db = createDb()

    // Get counts for each KYC status
    const [pendingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .innerJoin(schema.humans, eq(schema.users.humanAid, schema.humans.haid))
      .where(
        and(
          isNull(schema.users.deletedAt),
          sql`${schema.humans.dataIn}::jsonb->>'kycStatus' = 'pending'`
        )
      )
      .execute()

    const [verifiedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .innerJoin(schema.humans, eq(schema.users.humanAid, schema.humans.haid))
      .where(
        and(
          isNull(schema.users.deletedAt),
          sql`${schema.humans.dataIn}::jsonb->>'kycStatus' = 'verified'`
        )
      )
      .execute()

    const [rejectedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .innerJoin(schema.humans, eq(schema.users.humanAid, schema.humans.haid))
      .where(
        and(
          isNull(schema.users.deletedAt),
          sql`${schema.humans.dataIn}::jsonb->>'kycStatus' = 'rejected'`
        )
      )
      .execute()

    const [notStartedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .innerJoin(schema.humans, eq(schema.users.humanAid, schema.humans.haid))
      .where(
        and(
          isNull(schema.users.deletedAt),
          sql`(
            ${schema.humans.dataIn}::jsonb->>'kycStatus' IS NULL OR
            ${schema.humans.dataIn}::jsonb->>'kycStatus' = 'not_started' OR
            ${schema.humans.dataIn}::jsonb->>'kycStatus' = ''
          )`
        )
      )
      .execute()

    return NextResponse.json({
      success: true,
      stats: {
        pending: pendingCount?.count || 0,
        verified: verifiedCount?.count || 0,
        rejected: rejectedCount?.count || 0,
        not_started: notStartedCount?.count || 0,
      },
    })
  } catch (error) {
    console.error('Failed to fetch KYC stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch KYC stats', details: String(error) },
      { status: 500 }
    )
  }
}

export const GET = withAdminGuard(onRequestGet)

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

