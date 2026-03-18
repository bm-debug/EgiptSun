import { NextRequest, NextResponse } from 'next/server'
import { WalletRepository } from '@/shared/repositories/wallet.repository'
import { schema } from '@/shared/schema'
import { createDb } from '@/shared/repositories/utils'
import { eq, and, desc } from 'drizzle-orm'
import { withNotDeleted } from '@/shared/repositories/utils'
import { WalletType } from '@/shared/types/altrp-finance'

export async function GET(
  request: NextRequest,
  { params }: { params: { haid: string } }
) {
  try {
    const haid = params.haid
    const type = request.nextUrl.searchParams.get('type') as WalletType

    if (!haid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Human AID is required',
        },
        { status: 400 }
      )
    }

    // Use WalletRepository to get or create wallet
    const walletRepo = WalletRepository.getInstance()
    let wallet
    
    try {
      wallet = await walletRepo.getWalletByHumanHaid(haid, type)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      
      // Check if error is about unverified email
      if (errorMessage.includes('email is not verified')) {
        return NextResponse.json(
          {
            success: false,
            error: 'EMAIL_NOT_VERIFIED',
            message: 'Кошелек не может быть создан: email пользователя не подтвержден',
          },
          { status: 403 }
        )
      }
      
      // Re-throw other errors
      throw err
    }

    if (!wallet) {
      return NextResponse.json({
        success: true,
        wallet: null,
        transactions: [],
        message: 'Wallet not found',
      })
    }

    // Get balance using repository method (правильно обрабатывает копейки)
    const balance = await walletRepo.getBalance(wallet.uuid || '')
    const dataIn = wallet.dataIn && typeof wallet.dataIn === 'object'
      ? wallet.dataIn as any
      : { currency: 'RUB' }

    // Fetch transactions for this wallet
    const db = createDb()
    const transactions = await db
      .select()
      .from(schema.walletTransactions)
      .where(
        withNotDeleted(
          schema.walletTransactions.deletedAt,
          and(eq(schema.walletTransactions.fullWaid, `W-${wallet.waid}`))
        )
      )
      .orderBy(desc(schema.walletTransactions.createdAt))
      .limit(100)
      .execute()

    return NextResponse.json({
      success: true,
      wallet: {
        uuid: wallet.uuid,
        waid: wallet.waid,
        targetAid: wallet.targetAid,
        balance: balance, // В рублях, вычислено из копеек
        currency: dataIn.currency || 'RUB',
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
      transactions: transactions.map((tx: any) => {
        const txDataIn = tx.dataIn && typeof tx.dataIn === 'object' ? tx.dataIn : {}
        // tx.amount хранится в копейках, конвертируем в рубли
        const amountKopecks = parseInt(tx.amount || '0')
        return {
          uuid: tx.uuid,
          amount: amountKopecks / 100, // Конвертируем копейки в рубли
          type: txDataIn.type || 'UNKNOWN',
          status: tx.statusName || 'COMPLETED',
          description: txDataIn.description || txDataIn.comment || '',
          createdAt: tx.createdAt,
        }
      }),
    })
  } catch (error) {
    console.error('Error fetching wallet by Human AID:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch wallet',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


