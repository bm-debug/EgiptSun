import { eq, and, asc, sql } from 'drizzle-orm'
import BaseRepository from './BaseRepositroy'
import { schema } from '../schema'
import { Wallet } from '../schema/types'
import { altrpWallet, NewaltrpWallet, altrpFinance, WalletType } from '../types/altrp-finance'
import { generateAid } from '../generate-aid'
import { withNotDeleted, createDb } from './utils'
import { HumanRepository } from './human.repository'
import { altrpHuman } from '../types/altrp'
import { FinancesRepository } from './finances.repository'
import { logUserJournalEvent } from '../services/user-journal.service'
import type { Env } from '../types'
import { UsersRepository } from './users.repository'

export class WalletRepository extends BaseRepository<Wallet> {
  constructor() {
    super(schema.wallets)
  }

  public static getInstance(): WalletRepository {
    return new WalletRepository()
  }

  protected async beforeCreate(data: Partial<NewaltrpWallet>): Promise<void> {
    if (!data.waid) {
      data.waid = generateAid('w')
    }
    if (!data.fullWaid && data.waid) {
      data.fullWaid = `W-${data.waid}`
    }
    if (!data.statusName) {
      data.statusName = 'ACTIVE'
    }
    // Initialize balance if not provided
    // ВАЖНО: Храним баланс в копейках (целое число) для избежания ошибок округления
    if (data.dataIn && typeof data.dataIn === 'object') {
      const dataIn = data.dataIn as any
      if (dataIn.balanceKopecks === undefined) {
        dataIn.balanceKopecks = 0
        dataIn.balance = 0 // Для обратной совместимости
      }
      if (!dataIn.currency) {
        dataIn.currency = 'RUB'
      }
    } else {
      data.dataIn = {
        balanceKopecks: 0, // Храним в копейках
        balance: 0, // Для обратной совместимости
        currency: 'RUB',
      }
    }
  }

  /**
   * Получает кошелек по Human AID. Если кошелек не существует, создает новый.
   * ВАЖНО: Кошелек создается ТОЛЬКО если email пользователя подтвержден!
   * @param haid - Human AID (например, 'H-abc123')
   * @returns Объект кошелька
   * @throws Error если пользователь не найден или email не подтвержден
   */
  public async getWalletByHumanHaid(haid: string, type: WalletType = 'CLIENT'): Promise<altrpWallet> {
    // Загружаем human из базы данных
    const humanRepo = HumanRepository.getInstance()
    const human = (await humanRepo.findByHaid(haid)) as altrpHuman | null

    const usersRepo = UsersRepository.getInstance()
    let role
    let typeCondition = sql`(${schema.wallets.dataIn}::jsonb)->>'type' is null`
    switch (type) {
      case 'CLIENT':
        role = 'client'
        break
      case 'INVESTOR':
        role = 'investor'
        typeCondition = sql`(${schema.wallets.dataIn}::jsonb)->>'type' = 'INVESTOR'`
        break
      default:
        throw new Error(`Invalid wallet type: ${type}`)
    }
    const hasRole = await usersRepo.hasRole(haid, role)
    if (!hasRole) {
      throw new Error(`User with humanAid ${haid} does not have role ${role}`)
    }
    

    // Ищем существующий кошелек
    const [existingWallet] = await this.db
      .select()
      .from(schema.wallets)
      .where(
        withNotDeleted(
          schema.wallets.deletedAt,
          and(
            eq(schema.wallets.targetAid, haid),
            typeCondition
          )
        )
      )
      .execute()

    if (existingWallet) {
      return {
        ...existingWallet,
        human: human || undefined,
      } as altrpWallet
    }

    // Перед созданием кошелька проверяем, подтвержден ли email пользователя
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(
        withNotDeleted(
          schema.users.deletedAt,
          and(eq(schema.users.humanAid, haid))
        )
      )
      .execute()

    if (!user) {
      throw new Error(`User with humanAid ${haid} not found`)
    }

    // Проверяем подтверждение email
    if (!user.emailVerifiedAt) {
      throw new Error('Cannot create wallet: user email is not verified')
    }

    // Email подтвержден - создаем кошелек
    const newWallet: NewaltrpWallet = {
      uuid: crypto.randomUUID(),
      waid: generateAid('w'),
      targetAid: haid,
      title: `Кошелек для ${haid}`,
      statusName: 'ACTIVE',
      dataIn: {
        type: type === 'CLIENT' ? undefined : 'INVESTOR',
        balanceKopecks: 0, // Храним в копейках
        balance: 0, // Для обратной совместимости
        currency: 'RUB',
        createdReason: 'AUTO_CREATED_ON_ACCESS',
      },
    }

    // Автоматически сгенерируется fullWaid в beforeCreate
    const createdWallet = (await this.create(newWallet)) as altrpWallet

    // Добавляем human к результату
    return {
      ...createdWallet,
      human: human || undefined,
    } as altrpWallet
  }

  /**
   * Обновляет баланс кошелька (в копейках)
   * @param walletUuid - UUID кошелька
   * @param amountKopecks - Сумма изменения в копейках (положительная для пополнения, отрицательная для списания)
   * @returns Обновленный кошелек
   */
  public async updateBalance(walletUuid: string, amountKopecks: number): Promise<altrpWallet> {
    const wallet = (await this.findByUuid(walletUuid)) as altrpWallet | null

    if (!wallet) {
      throw new Error(`Wallet with uuid ${walletUuid} not found`)
    }

    const currentDataIn = wallet.dataIn && typeof wallet.dataIn === 'object' 
      ? wallet.dataIn as any 
      : { balanceKopecks: 0, balance: 0, currency: 'RUB' }
    
    // Получаем текущий баланс в копейках
    const currentBalanceKopecks = currentDataIn.balanceKopecks ?? (Math.round((currentDataIn.balance || 0) * 100))
    const newBalanceKopecks = currentBalanceKopecks + amountKopecks

    // Проверка на отрицательный баланс
    if (newBalanceKopecks < 0) {
      const currentBalanceRubles = currentBalanceKopecks / 100
      const attemptedDebitRubles = Math.abs(amountKopecks) / 100
      throw new Error(`Insufficient funds. Current balance: ${currentBalanceRubles} RUB, attempted debit: ${attemptedDebitRubles} RUB`)
    }

    // Вычисляем баланс в рублях для обратной совместимости
    const newBalanceRubles = newBalanceKopecks / 100

    const updatedWallet = (await this.update(walletUuid, {
      dataIn: {
        ...currentDataIn,
        balanceKopecks: newBalanceKopecks, // Храним в копейках (целое число)
        balance: newBalanceRubles, // Для обратной совместимости
        lastUpdatedAt: new Date().toISOString(),
      },
    })) as altrpWallet

    return updatedWallet
  }

  /**
   * Получает текущий баланс кошелька в копейках
   * @param walletUuid - UUID кошелька
   * @returns Текущий баланс в копейках (целое число)
   */
  public async getBalanceKopecks(walletUuid: string): Promise<number> {
    const wallet = (await this.findByUuid(walletUuid)) as altrpWallet | null

    if (!wallet) {
      throw new Error(`Wallet with uuid ${walletUuid} not found`)
    }

    const dataIn = wallet.dataIn && typeof wallet.dataIn === 'object'
      ? wallet.dataIn as any
      : { balanceKopecks: 0, balance: 0 }

    // Приоритет отдаем balanceKopecks, если нет - вычисляем из balance
    if (dataIn.balanceKopecks !== undefined && dataIn.balanceKopecks !== null) {
      return Math.round(dataIn.balanceKopecks)
    }
    
    // Обратная совместимость: вычисляем из balance в рублях
    return Math.round((dataIn.balance || 0) * 100)
  }

  /**
   * Получает текущий баланс кошелька в рублях (для обратной совместимости)
   * @param walletUuid - UUID кошелька
   * @returns Текущий баланс в рублях
   */
  public async getBalance(walletUuid: string): Promise<number> {
    const balanceKopecks = await this.getBalanceKopecks(walletUuid)
    return balanceKopecks / 100
  }

  /**
   * Получает все кошельки по Human AID (может быть несколько для разных валют)
   * @param haid - Human AID
   * @returns Массив кошельков
   */
  public async findAllByHumanHaid(haid: string): Promise<altrpWallet[]> {
    const wallets = await this.db
      .select()
      .from(schema.wallets)
      .where(
        withNotDeleted(
          schema.wallets.deletedAt,
          and(eq(schema.wallets.targetAid, haid))
        )
      )
      .execute()

    return wallets as altrpWallet[]
  }

  /**
   * Начисляет сумму транзакцией в копейках на кошелек
   * @param walletUuid - UUID кошелька
   * @param amountKopecks - Сумма в копейках (положительное число)
   * @param type - Тип транзакции (например, 'DEPOSIT', 'PROFIT_PAYOUT')
   * @param description - Описание транзакции
   * @returns Созданная транзакция
   */
  public async depositAmount(
    walletUuid: string,
    amountKopecks: number,
    type: string = 'DEPOSIT',
    description?: string,
    env?: Env
  ): Promise<any> {
    if (amountKopecks <= 0) {
      throw new Error('Amount must be positive')
    }

    const wallet = (await this.findByUuid(walletUuid)) as altrpWallet | null

    if (!wallet) {
      throw new Error(`Wallet with uuid ${walletUuid} not found`)
    }

    const walletDataIn = wallet.dataIn && typeof wallet.dataIn === 'object'
      ? (wallet.dataIn as any)
      : {}
    const walletType = walletDataIn.type || null

    // Обновляем баланс напрямую в копейках (избегаем ошибок округления)
    await this.updateBalance(walletUuid, amountKopecks)

    // Создаем транзакцию
    const transactionUuid = crypto.randomUUID()
    const transaction = await this.db
      .insert(schema.walletTransactions)
      .values({
        uuid: transactionUuid,
        wcaid: generateAid('wc'),
        fullWaid: wallet.fullWaid || `W-${wallet.waid}`,
        targetAid: wallet.targetAid,
        amount: amountKopecks.toString(), // Храним в копейках
        statusName: 'COMPLETED',
        dataIn: {
          type,
          description: description || `Пополнение ${(amountKopecks / 100).toFixed(2)} ₽`,
          amountKopecks,
          amountRubles: amountKopecks / 100,
          createdAt: new Date().toISOString(),
        },
      })
      .returning()
      .execute()

    // Проверяем и автоматически гасим finance (кроме инвесторских кошельков)
    if (walletType !== 'INVESTOR') {
      await this.checkAndPayPendingFinances(walletUuid, env)
    }

    // Log deposit event to journal
    if (env && wallet.targetAid) {
      try {
        // Find user by humanAid (targetAid)
        const db = createDb()
        const [user] = await db
          .select()
          .from(schema.users)
          .where(
            eq(schema.users.humanAid, wallet.targetAid)
          )
          .limit(1)
          .execute()

        if (user) {
          await logUserJournalEvent(
            env,
            'USER_JOURNAL_WALLET_DEPOSIT',
            {
              id: user.id,
              uuid: user.uuid,
              email: user.email,
              humanAid: user.humanAid,
              dataIn: user.dataIn as any,
            },
            {
              wallet: {
                uuid: wallet.uuid,
                waid: wallet.waid,
                fullWaid: wallet.fullWaid,
              },
              transaction: {
                uuid: transactionUuid,
                amountKopecks,
                amountRubles: amountKopecks / 100,
                type,
                description: description || `Пополнение ${(amountKopecks / 100).toFixed(2)} ₽`,
              },
            }
          )
        }
      } catch (journalError) {
        console.error('Failed to log wallet deposit event', journalError)
        // Don't fail deposit if journal logging fails
      }
    }

    return transaction[0]
  }

  /**
   * Проверяет есть ли оплаченные finance и автоматически гасит их
   * Общая сумма начислений должна быть больше суммы первого по дате finance
   * @param walletUuid - UUID кошелька
   * @param env - Environment variables (optional, для логирования событий)
   */
  public async checkAndPayPendingFinances(walletUuid: string, env?: Env): Promise<void> {
    const wallet = (await this.findByUuid(walletUuid)) as altrpWallet | null

    if (!wallet) {
      throw new Error(`Wallet with uuid ${walletUuid} not found`)
    }

    const haid = wallet.targetAid
    if (!haid) {
      return
    }

    // Получаем все неоплаченные finance для этого пользователя, отсортированные по дате платежа
    const financesRepo = FinancesRepository.getInstance()
    const pendingFinances = await this.db
      .select()
      .from(schema.finances)
      .where(
        withNotDeleted(
          schema.finances.deletedAt,
          and(
            eq(schema.finances.statusName, 'PENDING'),
            // Фильтруем по clientAid через dataIn
            // Нужно найти finance где dataIn.clientAid = haid
          )
        )
      )
      .execute()

    // Фильтруем finance по clientAid в dataIn
    const userFinances: altrpFinance[] = []
    for (const finance of pendingFinances) {
      const dataIn = finance.dataIn && typeof finance.dataIn === 'object'
        ? finance.dataIn as any
        : null
      
      if (dataIn?.clientAid === haid) {
        userFinances.push(finance as altrpFinance)
      }
    }

    if (userFinances.length === 0) {
      return
    }

    // Сортируем по дате платежа (paymentDate из dataIn)
    userFinances.sort((a, b) => {
      const aDataIn = a.dataIn && typeof a.dataIn === 'object' ? a.dataIn as any : {}
      const bDataIn = b.dataIn && typeof b.dataIn === 'object' ? b.dataIn as any : {}
      const aDate = aDataIn.paymentDate || ''
      const bDate = bDataIn.paymentDate || ''
      return aDate.localeCompare(bDate)
    })

    // Получаем текущий баланс кошелька в копейках (целое число, без ошибок округления)
    const balanceKopecks = await this.getBalanceKopecks(walletUuid)

    // Находим первый неоплаченный finance
    const firstFinance = userFinances[0]
    const firstFinanceDataIn = firstFinance.dataIn && typeof firstFinance.dataIn === 'object'
      ? firstFinance.dataIn as any
      : {}
    
    // Finance.sum хранится в копейках как строка, конвертируем в число
    const firstFinanceSumString = firstFinance.sum || '0'
    const firstFinanceAmountKopecks = parseInt(firstFinanceSumString, 10)
    const firstFinanceAmountRubles = firstFinanceAmountKopecks / 100

    // Логирование для отладки
    

    // Если баланс достаточен для оплаты первого finance
    if (balanceKopecks >= firstFinanceAmountKopecks) {
      const paidAt = new Date().toISOString()
      
      // Создаем транзакцию списания для оплаты finance
      const debitTransactionUuid = crypto.randomUUID()
      await this.db
        .insert(schema.walletTransactions)
        .values({
          uuid: debitTransactionUuid,
          wcaid: generateAid('wc'),
          fullWaid: wallet.fullWaid || `W-${wallet.waid}`,
          targetAid: wallet.targetAid,
          amount: (-firstFinanceAmountKopecks).toString(), // Отрицательная сумма в копейках
          statusName: 'COMPLETED',
          dataIn: {
            type: 'DEAL_REPAYMENT',
            description: `Оплата платежа ${firstFinance.faid}`,
            financeFaid: firstFinance.faid,
            dealAid: firstFinance.fullDaid,
            amountKopecks: -firstFinanceAmountKopecks,
            amountRubles: -firstFinanceAmountRubles,
            createdAt: paidAt,
          },
        })
        .execute()

      // Обновляем баланс (списание в копейках)
      await this.updateBalance(walletUuid, -firstFinanceAmountKopecks)

      // Помечаем finance как оплаченный
      await financesRepo.markFinanceAsPaid(firstFinance.uuid, {
        paidAt,
        paidAmount: firstFinanceAmountRubles, // В рублях для Finance
        walletTransactionUuid: debitTransactionUuid,
      })

      // Log finance payment event to journal
      if (env && wallet.targetAid) {
        try {
          // Find user by humanAid (targetAid)
          const db = createDb()
          const [user] = await db
            .select()
            .from(schema.users)
            .where(
              eq(schema.users.humanAid, wallet.targetAid)
            )
            .limit(1)
            .execute()

          if (user) {
            await logUserJournalEvent(
              env,
              'USER_JOURNAL_FINANCE_PAID',
              {
                id: user.id,
                uuid: user.uuid,
                email: user.email,
                humanAid: user.humanAid,
                dataIn: user.dataIn as any,
              },
              {
                wallet: {
                  uuid: wallet.uuid,
                  waid: wallet.waid,
                  fullWaid: wallet.fullWaid,
                },
                finance: {
                  uuid: firstFinance.uuid,
                  faid: firstFinance.faid,
                  fullDaid: firstFinance.fullDaid,
                  amountRubles: firstFinanceAmountRubles,
                  amountKopecks: firstFinanceAmountKopecks,
                },
                transaction: {
                  uuid: debitTransactionUuid,
                  amountKopecks: -firstFinanceAmountKopecks,
                  amountRubles: -firstFinanceAmountRubles,
                  type: 'DEAL_REPAYMENT',
                },
              }
            )
          }
        } catch (journalError) {
          console.error('Failed to log finance payment event', journalError)
          // Don't fail payment if journal logging fails
        }
      }

      // Рекурсивно проверяем остальные finance
      await this.checkAndPayPendingFinances(walletUuid, env)
    }
  }
}

