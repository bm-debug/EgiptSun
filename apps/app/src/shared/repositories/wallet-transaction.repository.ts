import { eq, and, desc, or } from 'drizzle-orm'
import BaseRepository from './BaseRepositroy'
import { schema } from '../schema'
import { WalletTransaction } from '../schema/types'
import { altrpWalletTransaction } from '../types/altrp-finance'
import { withNotDeleted, createDb } from './utils'
import { WalletRepository } from './wallet.repository'

export class WalletTransactionRepository extends BaseRepository<WalletTransaction> {
  constructor() {
    super(schema.walletTransactions)
  }

  public static getInstance(): WalletTransactionRepository {
    return new WalletTransactionRepository()
  }

  /**
   * Получает все транзакции для кошелька по fullWaid
   * @param fullWaid - Full Wallet AID (например, 'W-abc123')
   * @param limit - Максимальное количество транзакций (по умолчанию 100)
   * @returns Массив транзакций, отсортированных по дате создания (новые первыми)
   */
  public async findByWalletFullWaid(fullWaid: string, limit: number = 100): Promise<altrpWalletTransaction[]> {
    const transactions = await this.db
      .select()
      .from(schema.walletTransactions)
      .where(
        withNotDeleted(
          schema.walletTransactions.deletedAt,
          and(eq(schema.walletTransactions.fullWaid, fullWaid))
        )
      )
      .orderBy(desc(schema.walletTransactions.createdAt))
      .limit(limit)
      .execute()

    return transactions as altrpWalletTransaction[]
  }

  /**
   * Получает все транзакции для кошелька по targetAid (Human AID)
   * @param targetAid - Target AID (Human AID, например, 'H-abc123')
   * @param limit - Максимальное количество транзакций (по умолчанию 100)
   * @returns Массив транзакций, отсортированных по дате создания (новые первыми)
   */
  public async findByTargetAid(targetAid: string, limit: number = 100): Promise<altrpWalletTransaction[]> {
    const transactions = await this.db
      .select()
      .from(schema.walletTransactions)
      .where(
        withNotDeleted(
          schema.walletTransactions.deletedAt,
          and(eq(schema.walletTransactions.targetAid, targetAid))
        )
      )
      .orderBy(desc(schema.walletTransactions.createdAt))
      .limit(limit)
      .execute()

    return transactions as altrpWalletTransaction[]
  }

  /**
   * Получает все транзакции для инвестора по его Human AID
   * Ищет транзакции по targetAid и fullWaid (если есть связанный кошелек)
   * @param haid - Human AID инвестора
   * @param limit - Максимальное количество транзакций (по умолчанию 100)
   * @returns Массив транзакций, отсортированных по дате создания (новые первыми)
   */
  public async findByInvestorHaid(haid: string, limit: number = 100): Promise<altrpWalletTransaction[]> {
    // Получаем кошелек инвестора для поиска по fullWaid
    const walletRepo = WalletRepository.getInstance()
    const wallets = await walletRepo.findAllByHumanHaid(haid)
    
    const walletFullWaids = wallets.map(w => w.fullWaid || `W-${w.waid}`).filter(Boolean) as string[]

    // Строим условия для поиска: по targetAid ИЛИ по fullWaid кошельков инвестора
    const conditions: any[] = [eq(schema.walletTransactions.targetAid, haid)]
    
    if (walletFullWaids.length > 0) {
      const fullWaidConditions = walletFullWaids.map(waid => eq(schema.walletTransactions.fullWaid, waid))
      conditions.push(...fullWaidConditions)
    }

    const transactions = await this.db
      .select()
      .from(schema.walletTransactions)
      .where(
        withNotDeleted(
          schema.walletTransactions.deletedAt,
          and(or(...conditions)!)
        )
      )
      .orderBy(desc(schema.walletTransactions.createdAt))
      .limit(limit)
      .execute()

    return transactions as altrpWalletTransaction[]
  }
}

