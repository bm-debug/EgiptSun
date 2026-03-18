import { NextRequest, NextResponse } from 'next/server'
import { WalletRepository } from '@/shared/repositories/wallet.repository'
import { createDb } from '@/shared/repositories/utils'
import { schema } from '@/shared/schema'

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
      description?: string
    }
    const { amount, type, description } = body

    // Validation
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Amount is required and must be a positive number',
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

    // Get current balance before deposit
    const currentBalance = await walletRepo.getBalance(walletUuid)

    // Конвертируем рубли в копейки (избегаем ошибок округления)
    const amountKopecks = Math.round(amount * 100)

    // Начисляем средства (автоматически проверит и погасит finance)
    const transaction = await walletRepo.depositAmount(
      walletUuid,
      amountKopecks,
      type,
      description || `Ручное пополнение: ${amount} ₽`,
      process.env as any
    )

    // Get new balance after deposit
    const newBalance = await walletRepo.getBalance(walletUuid)

    // Parse transaction dataIn
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
        description: txDataIn.description || description,
        createdAt: transaction.createdAt,
      },
      wallet: {
        uuid: wallet.uuid,
        balance: newBalance,
      },
    })
  } catch (error) {
    console.error('Error depositing to wallet:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to deposit funds',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


