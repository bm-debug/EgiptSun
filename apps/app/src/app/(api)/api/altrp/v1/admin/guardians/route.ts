import { NextRequest } from 'next/server'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { createDb } from '@/shared/repositories/utils'
import { schema } from '@/shared/schema'
import { and, desc, isNull, sql, eq, inArray } from 'drizzle-orm'

const jsonHeaders = {
  'Content-Type': 'application/json',
} as const

interface Guardian {
  uuid: string
  haid: string
  fullName: string
  type?: string | null
  createdAt?: string
  dataIn?: any
  dealDaid?: string
  dealStatusName?: string
}

const handleGet = async (context: AuthenticatedRequestContext) => {
  const { request } = context
  try {
    const url = new URL(request.url)
    const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit') || 20), 100))
    const page = Math.max(1, Number(url.searchParams.get('page') || 1))
    const offset = (page - 1) * limit

    const db = createDb()

    // Get all humans that are guarantors
    // Filter by: type = 'GUARANTOR' OR has GUARANTOR relation
    // First, get all humans with type = 'GUARANTOR' OR with guarantor in dataIn
    const guardians = await db
      .select()
      .from(schema.humans)
      .where(
        and(
          isNull(schema.humans.deletedAt),
          sql`(
            ${schema.humans.type} = 'GUARANTOR' OR
            EXISTS (
              SELECT 1 FROM ${schema.relations}
              WHERE ${schema.relations.targetEntity} = ${schema.humans.haid}
              AND ${schema.relations.type} = 'GUARANTOR'
              AND ${schema.relations.deletedAt} IS NULL
            )
          )`
        )
      )
      .orderBy(desc(schema.humans.createdAt))
      .limit(limit)
      .offset(offset)
      .execute()

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.humans)
      .where(
        and(
          isNull(schema.humans.deletedAt),
          sql`(
            ${schema.humans.type} = 'GUARANTOR' OR
            EXISTS (
              SELECT 1 FROM ${schema.relations}
              WHERE ${schema.relations.targetEntity} = ${schema.humans.haid}
              AND ${schema.relations.type} = 'GUARANTOR'
              AND ${schema.relations.deletedAt} IS NULL
            )
          )`
        )
      )
      .execute()

    const total = Number(countResult?.count) || 0
    const totalPages = Math.max(1, Math.ceil(total / limit))

    // Get guarantor haids for this page
    const guardianHaids = guardians.map((g) => g.haid).filter(Boolean) as string[]

    // Get GUARANTOR relations for these guardians
    let guarantorRelations: Array<{ targetEntity: string; sourceEntity: string }> = []
    if (guardianHaids.length > 0) {
      guarantorRelations = await db
        .select({
          targetEntity: schema.relations.targetEntity,
          sourceEntity: schema.relations.sourceEntity,
        })
        .from(schema.relations)
        .where(
          and(
            eq(schema.relations.type, 'GUARANTOR'),
            isNull(schema.relations.deletedAt),
            inArray(schema.relations.targetEntity, guardianHaids)
          )
        )
        .execute()
    }

    // Get deal information
    const dealAids = Array.from(new Set(
      guarantorRelations.map((r) => r.sourceEntity).filter(Boolean) as string[]
    ))

    let deals: Array<{ daid: string; statusName: string | null }> = []
    if (dealAids.length > 0) {
      deals = await db
        .select({
          daid: schema.deals.daid,
          statusName: schema.deals.statusName,
        })
        .from(schema.deals)
        .where(inArray(schema.deals.daid, dealAids))
        .execute()
    }

    const dealMap = new Map(deals.map((d) => [d.daid, d.statusName]))

    // Create a map of guarantor haid to deal daid (use first relation for each guarantor)
    const guarantorToDealMap = new Map<string, string>()
    for (const relation of guarantorRelations) {
      if (relation.targetEntity && relation.sourceEntity) {
        if (!guarantorToDealMap.has(relation.targetEntity)) {
          guarantorToDealMap.set(relation.targetEntity, relation.sourceEntity)
        }
      }
    }

    // Process dataIn fields and add deal information
    const processedGuardians = guardians.map((guardian) => {
      const processed: any = { ...guardian }
      
      // Parse dataIn if it's a string
      if (processed.dataIn && typeof processed.dataIn === 'string') {
        try {
          processed.dataIn = JSON.parse(processed.dataIn)
        } catch {
          processed.dataIn = {}
        }
      }

      // Add deal information
      const dealDaid = guarantorToDealMap.get(guardian.haid)
      if (dealDaid) {
        processed.dealDaid = dealDaid
        processed.dealStatusName = dealMap.get(dealDaid) || null
      }
      
      return processed
    })

    return new Response(
      JSON.stringify({
        docs: processedGuardians,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      }),
      {
        status: 200,
        headers: jsonHeaders,
      }
    )
  } catch (error) {
    console.error('Get guardians error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch guardians',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: jsonHeaders,
      }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> }
) {
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handleGet(ctx)
  })(request, context)
}

