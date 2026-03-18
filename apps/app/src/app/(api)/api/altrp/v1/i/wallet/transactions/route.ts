import { NextResponse } from 'next/server'
import { withInvestorGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { MeRepository } from '@/shared/repositories/me.repository'
import { WalletTransactionRepository } from '@/shared/repositories/wallet-transaction.repository'

const handleGet = async (context: AuthenticatedRequestContext): Promise<Response> => {
  const { user } = context

  try {
    // Get human profile from user
    let human = user.human
    if (!human) {
      const meRepository = MeRepository.getInstance()
      const userWithRoles = await meRepository.findByIdWithRoles(Number(user.id), { includeHuman: true })
      human = userWithRoles?.human
    }

    if (!human || !human.haid) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Профиль инвестора не найден',
        },
        { status: 404 }
      )
    }

    // Get transactions for this investor
    const transactionRepo = WalletTransactionRepository.getInstance()
    const transactions = await transactionRepo.findByInvestorHaid(human.haid, 100)

    // Transform transactions for frontend
    const transformedTransactions = transactions.map((tx) => {
      const txDataIn = (tx.dataIn && typeof tx.dataIn === 'object' ? tx.dataIn : {}) as {
        type?: string
        description?: string
        comment?: string
      }
      
      // Parse amount (stored in kopecks as string)
      const amountKopecks = parseInt(tx.amount || '0', 10)
      const amountRubles = amountKopecks / 100

      // Determine transaction type from dataIn.type
      const typeFromData = txDataIn.type || 'UNKNOWN'
      let transactionType: 'deposit' | 'withdrawal' | 'investment' | 'return' | 'other' = 'other'
      
      if (typeFromData.includes('DEPOSIT') || typeFromData.includes('Пополнение')) {
        transactionType = 'deposit'
      } else if (typeFromData.includes('WITHDRAW') || typeFromData.includes('Вывод')) {
        transactionType = 'withdrawal'
      } else if (typeFromData.includes('INVESTMENT') || typeFromData.includes('Инвестиция')) {
        transactionType = 'investment'
      } else if (typeFromData.includes('PROFIT') || typeFromData.includes('Прибыль') || typeFromData.includes('RETURN') || typeFromData.includes('Возврат')) {
        transactionType = 'return'
      }

      return {
        id: tx.uuid || `txn-${tx.id}`,
        uuid: tx.uuid,
        type: transactionType,
        amount: amountRubles, // В рублях для отображения
        comment: txDataIn.description || txDataIn.comment || '',
        date: tx.createdAt,
        status: tx.statusName?.toLowerCase() || 'completed',
        statusName: tx.statusName || 'COMPLETED',
      }
    })

    return NextResponse.json(
      {
        success: true,
        transactions: transformedTransactions,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get investor transactions error:', error)
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

export const GET = withInvestorGuard(handleGet)

