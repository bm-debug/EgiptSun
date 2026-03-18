import { NextRequest, NextResponse } from 'next/server'
import { WalletRepository } from '@/shared/repositories/wallet.repository'
import { schema } from '@/shared/schema'
import { createDb } from '@/shared/repositories/utils'
import { generateAid } from '@/shared/generate-aid'
import { eq, and, desc } from 'drizzle-orm'
import { withNotDeleted } from '@/shared/repositories/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid: walletUuid } = await params

    if (!walletUuid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet UUID is required',
        },
        { status: 400 }
      )
    }

    // Use WalletRepository to verify wallet exists
    const walletRepo = WalletRepository.getInstance()
    const wallet = await walletRepo.findByUuid(walletUuid)

    if (!wallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet not found',
        },
        { status: 404 }
      )
    }

    // Fetch transactions for this wallet
    const db = createDb()
    const transactions = await db
      .select()
      .from(schema.walletTransactions)
      .where(
        withNotDeleted(
          schema.walletTransactions.deletedAt,
          and(eq(schema.walletTransactions.fullWaid, wallet.fullWaid || `W-${wallet.waid}`))
        )
      )
      .orderBy(desc(schema.walletTransactions.createdAt))
      .limit(100)
      .execute()

    // Transform transactions
    const transformedTransactions = transactions.map((tx: any) => {
      const txDataIn = tx.dataIn && typeof tx.dataIn === 'object' ? tx.dataIn : {}
      // tx.amount хранится в копейках, конвертируем в рубли
      const amountKopecks = parseInt(tx.amount || '0', 10)
      return {
        uuid: tx.uuid,
        amount: amountKopecks.toString(), // Оставляем в копейках для компонента
        statusName: tx.statusName || 'COMPLETED',
        createdAt: tx.createdAt,
        dataIn: {
          type: txDataIn.type || 'UNKNOWN',
          description: txDataIn.description || txDataIn.comment || '',
        },
      }
    })

    return NextResponse.json({
      success: true,
      transactions: transformedTransactions,
    })
  } catch (error) {
    console.error('Error fetching wallet transactions:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transactions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid: walletUuid } = await params

    if (!walletUuid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet UUID is required',
        },
        { status: 400 }
      )
    }

    // Parse request body
    const body = (await request.json()) as {
      amount?: number
      type?: string
      comment?: string
    }
    const { amount, type, comment } = body

    // Validation
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'Amount is required and must be a number',
        },
        { status: 400 }
      )
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Type is required',
        },
        { status: 400 }
      )
    }

    if (!comment || typeof comment !== 'string' || comment.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Comment is required for manual transactions',
        },
        { status: 400 }
      )
    }

    // Use WalletRepository
    const walletRepo = WalletRepository.getInstance()
    const wallet = await walletRepo.findByUuid(walletUuid)

    if (!wallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet not found',
        },
        { status: 404 }
      )
    }

    // Get current balance before transaction
    const currentBalance = await walletRepo.getBalance(walletUuid)

    // Конвертируем рубли в копейки (избегаем ошибок округления)
    const amountKopecks = Math.round(amount * 100)

    // Create transaction record
    const db = createDb()
    const transactionUuid = crypto.randomUUID()
    const [transaction] = await db
      .insert(schema.walletTransactions)
      .values({
        uuid: transactionUuid,
        wcaid: generateAid('wc'),
        fullWaid: `W-${wallet.waid}`,
        targetAid: wallet.targetAid,
        amount: amountKopecks.toString(), // Храним в копейках
        statusName: 'COMPLETED',
        dataIn: {
          type,
          description: comment,
          comment,
          manualEntry: true,
          amountKopecks,
          amountRubles: amount,
          createdAt: new Date().toISOString(),
        },
      })
      .returning()
      .execute()

    // Update wallet balance using repository method (в копейках)
    const updatedWallet = await walletRepo.updateBalance(walletUuid, amountKopecks)

    // Get new balance from updated wallet
    const newBalance = await walletRepo.getBalance(walletUuid)

    // Create Journal entry for audit trail
    try {
      await db.insert(schema.journals).values({
        uuid: crypto.randomUUID(),
        action: 'MANUAL_WALLET_TRANSACTION',
        details: {
          entityType: 'wallet-transaction',
          entityId: transactionUuid,
          action: 'CREATE',
          walletUuid,
          walletAid: wallet.waid,
          amount,
          type,
          comment,
          oldBalance: currentBalance,
          newBalance,
          description: `Администратор создал транзакцию вручную: ${type} на сумму ${amount} ₽`,
        },
      })
    } catch (journalError) {
      console.error('Failed to create journal entry:', journalError)
      // Continue even if journal fails
    }

    // Parse dataIn to get type and description
    const txDataIn = transaction.dataIn && typeof transaction.dataIn === 'object'
      ? transaction.dataIn as any
      : {}

    // Конвертируем amount из копеек в рубли для ответа
    const amountKopecksFromTx = parseInt(transaction.amount || '0')
    const amountRublesFromTx = amountKopecksFromTx / 100

    return NextResponse.json({
      success: true,
      transaction: {
        uuid: transaction.uuid,
        amount: amountRublesFromTx, // В рублях для ответа
        type: txDataIn.type || type,
        status: transaction.statusName,
        description: txDataIn.description || comment,
        createdAt: transaction.createdAt,
      },
      wallet: {
        uuid: updatedWallet.uuid,
        balance: newBalance,
      },
    })
  } catch (error) {
    console.error('Error creating wallet transaction:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

