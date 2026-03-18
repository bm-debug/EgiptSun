import { NextResponse } from "next/server"
import type { AuthenticatedRequestContext } from "@/shared/api-guard"
import { withTesterGuard } from "@/shared/api-guard"
import { WalletRepository } from "@/shared/repositories/wallet.repository"
import { WalletTransactionRepository } from "@/shared/repositories/wallet-transaction.repository"
import { parseJson } from "@/shared/repositories/utils"

async function handleGet(context: AuthenticatedRequestContext) {
  try {
    const { user } = context

    if (!user.humanAid) {
      return NextResponse.json(
        { success: false, error: "USER_HAS_NO_HUMAN_PROFILE" },
        { status: 400 }
      )
    }

    const haid = user.humanAid
    const walletRepo = WalletRepository.getInstance()
    const transactionRepo = WalletTransactionRepository.getInstance()

    let balance = 0
    try {
      const wallets = await walletRepo.findAllByHumanHaid(haid)
      for (const w of wallets) {
        const dataIn = parseJson<{ balance?: number; balanceKopecks?: number }>(w.dataIn || "", {})
        balance += dataIn.balance ?? (dataIn.balanceKopecks ?? 0) / 100
      }
    } catch {
      // No wallet yet
    }

    const transactions = await transactionRepo.findByTargetAid(haid, 100)

    const transformedTransactions = transactions.map((tx) => {
      const txDataIn = parseJson<{ type?: string; description?: string; comment?: string }>(tx.dataIn || "", {})
      const amountKopecks = parseInt(tx.amount || "0", 10)
      const amountPoints = amountKopecks / 100

      let transactionType: "reward" | "withdrawal" | "other" = "other"
      const typeFromData = txDataIn.type || ""
      if (typeFromData.includes("REWARD") || typeFromData.includes("Награда")) {
        transactionType = "reward"
      } else if (typeFromData.includes("WITHDRAW")) {
        transactionType = "withdrawal"
      }

      return {
        id: tx.uuid || `txn-${tx.id}`,
        uuid: tx.uuid,
        type: transactionType,
        amount: amountPoints,
        comment: txDataIn.description || txDataIn.comment || "",
        date: tx.createdAt,
        status: tx.statusName?.toLowerCase() || "completed",
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        balance: Math.round(balance),
        transactions: transformedTransactions,
      },
    })
  } catch (error) {
    console.error("[GET /api/altrp/v1/t/wallet]", error)
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: String(error) },
      { status: 500 }
    )
  }
}

export const GET = withTesterGuard(handleGet)
