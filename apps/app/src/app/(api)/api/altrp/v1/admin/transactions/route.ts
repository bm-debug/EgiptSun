import { NextResponse } from 'next/server'
import { WalletTransactionRepository } from '@/shared/repositories/wallet-transaction.repository'
import type { DbFilters, DbOrders, DbPagination } from '@/shared/types/shared'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { schema } from '@/shared/schema'
import { createDb, withNotDeleted } from '@/shared/repositories/utils'
import { eq, and, desc, sql, or, isNull } from 'drizzle-orm'

/**
 * GET /api/altrp/v1/admin/transactions
 * Returns all wallet transactions in the system with pagination
 * Sorted by createdAt DESC (newest first) by default
 */
const onRequestGet = async (context: AuthenticatedRequestContext) => {
  const { request } = context
  const url = new URL(request.url)
  
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const search = url.searchParams.get('search') || ''
  const status = url.searchParams.get('status') || ''
  const walletId = url.searchParams.get('walletId') || ''
  const walletType = url.searchParams.get('walletType') || ''

  try {
    const db = createDb()
    
    // Build where conditions
    const conditions: any[] = [
      isNull(schema.walletTransactions.deletedAt),
    ]

    // Add status filter if provided
    if (status) {
      conditions.push(eq(schema.walletTransactions.statusName, status))
    }

    // Add wallet ID filter if provided
    if (walletId) {
      conditions.push(sql`${schema.walletTransactions.fullWaid} LIKE ${`%${walletId}%`}`)
    }

    // Add search filter if provided (search by transaction ID)
    if (search) {
      conditions.push(sql`${schema.walletTransactions.wcaid} LIKE ${`%${search}%`}`)
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined

    // Build base query with JOIN to wallets for filtering by wallet type
    let baseQuery = db
      .select({
        uuid: schema.walletTransactions.uuid,
        wcaid: schema.walletTransactions.wcaid,
        fullWaid: schema.walletTransactions.fullWaid,
        targetAid: schema.walletTransactions.targetAid,
        amount: schema.walletTransactions.amount,
        statusName: schema.walletTransactions.statusName,
        order: schema.walletTransactions.order,
        createdAt: schema.walletTransactions.createdAt,
        updatedAt: schema.walletTransactions.updatedAt,
        dataIn: schema.walletTransactions.dataIn,
        walletDataIn: schema.wallets.dataIn,
      })
      .from(schema.walletTransactions)
      .leftJoin(
        schema.wallets,
        and(
          isNull(schema.wallets.deletedAt),
          or(
            eq(schema.wallets.fullWaid, schema.walletTransactions.fullWaid),
            sql`${schema.walletTransactions.fullWaid} = CONCAT('W-', ${schema.wallets.waid})`
          )!
        )
      )

    // Add wallet type filter if provided (filter by wallet.dataIn.type)
    // CLIENT means dataIn.type is null or empty
    let finalWhereCondition = whereCondition
    if (walletType) {
      // Ensure wallet exists (not NULL from LEFT JOIN) when filtering by type
      const walletExistsCondition = sql`${schema.wallets.id} IS NOT NULL`
      
      let walletTypeCondition
      if (walletType === 'CLIENT') {
        // For CLIENT: filter where dataIn.type is NULL or empty string
        walletTypeCondition = sql`(
          (${schema.wallets.dataIn}::jsonb->>'type') IS NULL OR
          (${schema.wallets.dataIn}::jsonb->>'type') = '' OR
          (${schema.wallets.dataIn}::jsonb->>'type') = 'null'
        )`
      } else {
        // For other types (e.g., INVESTOR): filter where dataIn.type equals the type
        walletTypeCondition = sql`(${schema.wallets.dataIn}::jsonb->>'type') = ${walletType}`
      }
      
      const combinedWalletCondition = and(walletExistsCondition, walletTypeCondition)
      finalWhereCondition = whereCondition 
        ? and(whereCondition, combinedWalletCondition)
        : combinedWalletCondition
    }

    // Apply where conditions
    const query = finalWhereCondition 
      ? baseQuery.where(finalWhereCondition)
      : baseQuery

    // Get total count for pagination
    let countBaseQuery = db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(schema.walletTransactions)
      .leftJoin(
        schema.wallets,
        and(
          isNull(schema.wallets.deletedAt),
          or(
            eq(schema.wallets.fullWaid, schema.walletTransactions.fullWaid),
            sql`${schema.walletTransactions.fullWaid} = CONCAT('W-', ${schema.wallets.waid})`
          )!
        )
      )

    const countQuery = finalWhereCondition
      ? countBaseQuery.where(finalWhereCondition)
      : countBaseQuery

    const countResult = await countQuery.execute()
    const total = countResult[0]?.count || 0
    const totalPages = Math.max(1, Math.ceil(total / limit))

    // Apply sorting and pagination
    const offset = (page - 1) * limit
    const result = await query
      .orderBy(desc(schema.walletTransactions.createdAt), schema.walletTransactions.order)
      .limit(limit)
      .offset(offset)
      .execute()

    // Transform wallet transactions to response format
    const transactions = result.map((transaction: any) => {
      const dataIn = transaction.dataIn && typeof transaction.dataIn === 'object'
        ? transaction.dataIn as any
        : {}

      const walletDataIn = transaction.walletDataIn && typeof transaction.walletDataIn === 'object'
        ? transaction.walletDataIn as any
        : {}

      // transaction.amount хранится в копейках (строка), конвертируем в рубли
      const amountKopecks = transaction.amount ? parseInt(String(transaction.amount), 10) : 0
      const amount = amountKopecks / 100 // Конвертируем копейки в рубли

      // Extract wallet type from wallet.dataIn.type
      const walletType = walletDataIn.type || null

      return {
        uuid: transaction.uuid,
        wcaid: transaction.wcaid,
        fullWaid: transaction.fullWaid || null,
        targetAid: transaction.targetAid || null,
        statusName: transaction.statusName || 'COMPLETED',
        amount: amount,
        type: dataIn.type || 'UNKNOWN',
        description: dataIn.description || dataIn.comment || '',
        order: transaction.order ? parseFloat(String(transaction.order)) : 0,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        walletType: walletType,
      }
    })

    return NextResponse.json({
      success: true,
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Get transactions error (admin):', error)
    return NextResponse.json(
      { error: 'Failed to get transactions', details: String(error) },
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

