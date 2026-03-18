import { and, eq } from 'drizzle-orm'
import BaseRepository from './BaseRepositroy'
import { schema } from '../schema'
import { Deal, Finance } from '../schema/types'
import { generateAid } from '../generate-aid'
import {
  altrpFinance,
  FinanceDataIn,
  FinanceDataOut,
  FinanceReceipt,
  FinanceStatusHistoryEntry,
  MediaDataIn,
  NewaltrpFinance,
  PaymentScheduleInput,
  PaymentScheduleResult,
  WalletTransaction,
  IsoDate,
  IsoDateTime,
} from '../types/altrp-finance'
import { parseJson, withNotDeleted } from './utils'
import { DealsRepository } from './deals.repository'
import { MediaRepository } from './media.repository'
import { HumanRepository } from './human.repository'
import { NoticesRepository } from './notices.repository'
import { buildPaymentReminderEmailHtml, buildPaymentOverdueEmailHtml } from '../services/email-templates.service'

export class FinancesRepository extends BaseRepository<Finance> {
  constructor() {
    super(schema.finances)
  }

  public static getInstance(): FinancesRepository {
    return new FinancesRepository()
  }

  protected async beforeCreate(data: Partial<NewaltrpFinance>): Promise<void> {
    if (!data.faid) {
      data.faid = generateAid('f')
    }
    if (!data.fullDaid && data.dataIn && typeof data.dataIn === 'object') {
      data.fullDaid = data.dataIn.dealAid
    }
    if (!data.statusName) {
      data.statusName = 'PENDING'
    }
  }

  protected async beforeUpdate(_: string, data: Partial<NewaltrpFinance>): Promise<void> {
    return
  }

  public async generateScheduleForDeal(
    dealUuid: string,
    input: PaymentScheduleInput
  ): Promise<PaymentScheduleResult> {
    const dealsRepo = new DealsRepository()
    const deal = (await dealsRepo.findByUuid(dealUuid)) as Deal | null

    if (!deal) {
      throw new Error(`Deal with uuid ${dealUuid} not found`)
    }

    if (input.dealAid !== deal.daid) {
      throw new Error(
        `Deal AID mismatch: input.dealAid (${input.dealAid}) does not match deal.daid (${deal.daid})`
      )
    }

    const remainingAmount = input.totalAmount - (input.upfrontAmount ?? 0)
    const termMonths = input.termMonths
    
    // Конвертируем все суммы в копейки для точных расчетов
    const remainingAmountKopecks = Math.round(remainingAmount * 100)
    
    // Вычисляем сумму одного платежа в копейках (округление вниз)
    const monthlyPaymentKopecks = Math.floor(remainingAmountKopecks / termMonths)
    
    // Вычисляем остаток, который нужно распределить по платежам
    const remainderKopecks = remainingAmountKopecks - (monthlyPaymentKopecks * termMonths)
    
    // Проценты для распределения
    const principalPercent = 0.7
    const profitSharePercent = 0.25
    const serviceFeePercent = 0.05
    
    // Вычисляем суммы компонентов в копейках
    const principalTotalKopecks = Math.round(remainingAmountKopecks * principalPercent)
    const profitShareTotalKopecks = Math.round(remainingAmountKopecks * profitSharePercent)
    const serviceFeeTotalKopecks = Math.round(remainingAmountKopecks * serviceFeePercent)
    
    // Сумма компонентов одного платежа в копейках
    const principalPerPaymentKopecks = Math.floor(principalTotalKopecks / termMonths)
    const profitSharePerPaymentKopecks = Math.floor(profitShareTotalKopecks / termMonths)
    const serviceFeePerPaymentKopecks = Math.floor(serviceFeeTotalKopecks / termMonths)
    
    // Остатки для распределения
    const principalRemainderKopecks = principalTotalKopecks - (principalPerPaymentKopecks * termMonths)
    const profitShareRemainderKopecks = profitShareTotalKopecks - (profitSharePerPaymentKopecks * termMonths)
    const serviceFeeRemainderKopecks = serviceFeeTotalKopecks - (serviceFeePerPaymentKopecks * termMonths)

    const firstDate = new Date(input.firstPaymentDate)
    const paymentDates: Date[] = []

    for (let i = 0; i < termMonths; i++) {
      const paymentDate = new Date(firstDate)
      paymentDate.setMonth(paymentDate.getMonth() + i)
      paymentDates.push(paymentDate)
    }

    const scheduleItems: FinanceDataIn[] = []
    let totalSumKopecks = 0 // Для проверки

    for (let i = 0; i < termMonths; i++) {
      const paymentNumber = i + 1
      const paymentDate = paymentDates[i]
      const isLastPayment = i === termMonths - 1
      
      // Для последнего платежа добавляем остатки, чтобы сумма была точной
      const paymentSumKopecks = isLastPayment
        ? monthlyPaymentKopecks + remainderKopecks
        : monthlyPaymentKopecks
      
      const principalKopecks = isLastPayment
        ? principalPerPaymentKopecks + principalRemainderKopecks
        : principalPerPaymentKopecks
      
      const profitShareKopecks = isLastPayment
        ? profitSharePerPaymentKopecks + profitShareRemainderKopecks
        : profitSharePerPaymentKopecks
      
      const serviceFeeKopecks = isLastPayment
        ? serviceFeePerPaymentKopecks + serviceFeeRemainderKopecks
        : serviceFeePerPaymentKopecks
      
      // Конвертируем обратно в рубли для dataIn (для обратной совместимости)
      const paymentSumRubles = paymentSumKopecks / 100
      const principalRubles = principalKopecks / 100
      const profitShareRubles = profitShareKopecks / 100
      const serviceFeeRubles = serviceFeeKopecks / 100
      
      totalSumKopecks += paymentSumKopecks

      const financeDataIn: FinanceDataIn = {
        paymentNumber,
        paymentDate: paymentDate.toISOString().split('T')[0] as IsoDate,
        totalAmount: paymentSumRubles,
        principalAmount: principalRubles,
        profitShareAmount: profitShareRubles,
        serviceFeeAmount: serviceFeeRubles,
        autoDebitEnabled: input.paymentMethod === 'INTERNAL_WALLET',
        preferredPaymentChannel: input.paymentMethod,
        reminderScheduleDays: input.limits.reminderDaysBefore,
        dealAid: input.dealAid,
        clientAid: deal.clientAid as string | null,
        generatedBy: input.generatedBy === 'ADMIN' ? 'MANUAL' : input.generatedBy,
      }

      scheduleItems.push(financeDataIn)

      const newFinance: NewaltrpFinance = {
        uuid: crypto.randomUUID(),
        faid: generateAid('f'),
        fullDaid: input.dealAid,
        title: `Платеж ${paymentNumber} по сделке ${input.dealAid}`,
        sum: paymentSumKopecks.toString(), // Храним в копейках как строку
        currencyId: 'RUB',
        cycle: 'MONTHLY',
        type: 'INSTALLMENT',
        statusName: 'PENDING',
        order: paymentNumber.toString(),
        dataIn: financeDataIn,
        dataOut: {
          statusHistory: [
            {
              status: 'PENDING',
              changedAt: new Date().toISOString(),
              source: 'SYSTEM',
            },
          ],
        },
      }

      await this.create(newFinance)
    }
    
    // Проверка: сумма всех платежей должна равняться общей сумме
    if (totalSumKopecks !== remainingAmountKopecks) {
      console.warn(`Payment schedule sum mismatch: expected ${remainingAmountKopecks} kopecks, got ${totalSumKopecks} kopecks`)
    }

    return {
      items: scheduleItems,
      summary: {
        totalInstallments: termMonths,
        totalPrincipal: principalTotalKopecks / 100, // Конвертируем обратно в рубли
        totalProfitShare: profitShareTotalKopecks / 100,
        totalServiceFees: serviceFeeTotalKopecks / 100,
        nextPaymentDate: paymentDates[0].toISOString().split('T')[0] as IsoDate,
      },
    }
  }

  public async markFinanceAsPaid(
    financeUuid: string,
    payload: {
      paidAt: IsoDateTime
      paidAmount: number
      walletTransactionUuid: WalletTransaction['uuid']
      receipts?: MediaDataIn[]
    }
  ): Promise<altrpFinance> {
    const finance = (await this.findByUuid(financeUuid)) as altrpFinance | null

    if (!finance) {
      throw new Error(`Finance with uuid ${financeUuid} not found`)
    }

    const dataOut = parseJson<FinanceDataOut>(
      finance.dataOut,
      {
        statusHistory: [],
      }
    )

    const statusHistoryEntry: FinanceStatusHistoryEntry = {
      status: 'PAID',
      changedAt: payload.paidAt,
      source: 'SYSTEM',
    }

    const updatedStatusHistory = [...dataOut.statusHistory, statusHistoryEntry]

    const receipts: FinanceReceipt[] = dataOut.receipts ?? []

    if (payload.receipts?.length) {
      const mediaRepo = MediaRepository.getInstance()

      for (const receiptData of payload.receipts) {
        const media = await mediaRepo.create({
          uuid: crypto.randomUUID(),
          title: `Квитанция об оплате платежа ${finance.faid}`,
          dataIn: {
            ...receiptData,
            documentType: 'PAYMENT_RECEIPT',
            financeFaid: finance.faid,
            dealAid: receiptData.dealAid ?? finance.fullDaid ?? undefined,
          },
        })

        receipts.push({
          mediaUuid: media.uuid,
          uploadedAt: payload.paidAt,
          filename: media.fileName || media.filename || 'receipt',
        })
      }
    }

    const updatedFinance = (await this.update(financeUuid, {
      statusName: 'PAID',
      dataOut: {
        ...dataOut,
        paidAt: payload.paidAt,
        paidAmount: payload.paidAmount,
        walletTransactionUuid: payload.walletTransactionUuid,
        statusHistory: updatedStatusHistory,
        receipts,
      },
    })) as altrpFinance

    // Проверяем, все ли finance по сделке оплачены
    if (finance.fullDaid) {
      try {
        const allFinances = await this.db
          .select()
          .from(schema.finances)
          .where(
            withNotDeleted(
              schema.finances.deletedAt,
              eq(schema.finances.fullDaid, finance.fullDaid)
            )
          )
          .execute()

        // Проверяем, все ли finance оплачены
        const allPaid = allFinances.every((f) => f.statusName === 'PAID')

        if (allPaid && allFinances.length > 0) {
          // Находим сделку по fullDaid (daid)
          const dealsRepo = new DealsRepository()
          // Ищем сделку по daid через getSelectQuery
          const deals = await dealsRepo.getSelectQuery()
            .where(eq(schema.deals.daid, finance.fullDaid))
            .limit(1)
            .execute()

          if (deals.length > 0) {
            const deal = deals[0]
            // Обновляем статус сделки на COMPLETED, если она еще не в этом статусе
            if (deal.statusName !== 'COMPLETED' && deal.statusName !== 'CANCELLED') {
              await dealsRepo.update(deal.uuid, {
                statusName: 'COMPLETED',
              })
              console.log(`[FinancesRepository] Deal ${finance.fullDaid} marked as COMPLETED - all finances paid`)
            }
          }
        }
      } catch (error) {
        console.error('[FinancesRepository] Failed to check and update deal status:', error)
        // Не прерываем процесс оплаты finance, если не удалось обновить статус сделки
      }
    }

    return updatedFinance
  }

  public async markPendingAsOverdue(referenceDate: IsoDate): Promise<altrpFinance[]> {
    const referenceDateTime = new Date(referenceDate)
    const referenceDateOnly = new Date(
      referenceDateTime.getFullYear(),
      referenceDateTime.getMonth(),
      referenceDateTime.getDate()
    )

    const pendingFinances = await this.db
      .select()
      .from(schema.finances)
      .where(
        withNotDeleted(
          schema.finances.deletedAt,
          and(eq(schema.finances.statusName, 'PENDING'))
        )
      )
      .execute()

    const overdueFinances: altrpFinance[] = []

    for (const finance of pendingFinances) {
      const dataIn = parseJson<FinanceDataIn | null>(finance.dataIn, null)

      if (!dataIn?.paymentDate) {
        continue
      }

      const paymentDate = new Date(dataIn.paymentDate)
      const paymentDateOnly = new Date(
        paymentDate.getFullYear(),
        paymentDate.getMonth(),
        paymentDate.getDate()
      )

      if (paymentDateOnly < referenceDateOnly) {
        const existingDataOut = parseJson<FinanceDataOut>(
          finance.dataOut,
          {
            statusHistory: [],
          }
        )

        const overdueDays = Math.floor(
          (referenceDateOnly.getTime() - paymentDateOnly.getTime()) / (1000 * 60 * 60 * 24)
        )

        const statusHistoryEntry: FinanceStatusHistoryEntry = {
          status: 'OVERDUE',
          changedAt: new Date().toISOString(),
          source: 'AUTO_RULE',
          comment: `Automatically marked as overdue. Payment date: ${dataIn.paymentDate}`,
        }

        const updatedFinance = (await this.update(finance.uuid, {
          statusName: 'OVERDUE',
          dataOut: {
            ...existingDataOut,
            overdueDays,
            statusHistory: [...existingDataOut.statusHistory, statusHistoryEntry],
          },
        })) as altrpFinance

        overdueFinances.push(updatedFinance)
      }
    }

    return overdueFinances
  }

  /**
   * Проверяет все текущие платежи и меняет статус при просрочке
   * @param referenceDate - Дата для проверки (по умолчанию текущая дата)
   * @returns Массив просроченных платежей, которым был изменен статус
   */
  public async checkAndMarkOverduePayments(referenceDate?: IsoDate): Promise<altrpFinance[]> {
    const checkDate = referenceDate || (new Date().toISOString().split('T')[0] as IsoDate)
    return this.markPendingAsOverdue(checkDate)
  }

  /**
   * Отправляет уведомление пользователю о платеже (приближение даты платежа или просрочка)
   * @param financeUuid - UUID записи в finance
   * @param options - Опции для уведомления
   * @returns Результат отправки уведомлений
   */
  public async sendPaymentNotification(
    financeUuid: string,
    options?: {
      daysBeforeThreshold?: number // Порог для отправки напоминания (по умолчанию 3 дня)
      forceReminder?: boolean // Принудительно отправить напоминание, даже если уже было отправлено
    }
  ): Promise<{
    sent: boolean
    error?: string
    notificationType: 'reminder' | 'overdue'
    finance: altrpFinance
  }> {
    const daysBeforeThreshold = options?.daysBeforeThreshold ?? 3
    const forceReminder = options?.forceReminder ?? false

    // Получаем finance по UUID
    const finance = (await this.findByUuid(financeUuid)) as altrpFinance | null

    if (!finance) {
      throw new Error(`Finance with uuid ${financeUuid} not found`)
    }

    // Пропускаем уже оплаченные платежи
    if (finance.statusName === 'PAID') {
      return {
        sent: false,
        error: 'Payment is already paid',
        notificationType: 'reminder',
        finance,
      }
    }

    const dataIn = parseJson<FinanceDataIn | null>(finance.dataIn, null)
    const dataOut = parseJson<FinanceDataOut>(finance.dataOut, {
      statusHistory: [],
    })

    if (!dataIn?.paymentDate || !dataIn?.clientAid) {
      return {
        sent: false,
        error: 'Payment date or client AID is missing',
        notificationType: 'reminder',
        finance,
      }
    }

    // Получаем клиента
    const humanRepository = HumanRepository.getInstance()
    const client = await humanRepository.findByHaid(dataIn.clientAid)

    if (!client || !client.email) {
      return {
        sent: false,
        error: 'Client not found or email is missing',
        notificationType: 'reminder',
        finance,
      }
    }

    const noticesRepository = NoticesRepository.getInstance()
    const currentDate = new Date()
    const paymentDate = new Date(dataIn.paymentDate)
    const daysUntilPayment = Math.ceil(
      (paymentDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const overdueDays = finance.statusName === 'OVERDUE' && dataOut.overdueDays
      ? dataOut.overdueDays
      : paymentDate < currentDate
      ? Math.ceil((currentDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    let notificationType: 'reminder' | 'overdue' = 'reminder'
    let emailSubject = ''
    let emailBody = ''
    let pushTitle = ''
    let pushBody = ''

    // Определяем тип уведомления и формируем сообщения
    if (finance.statusName === 'OVERDUE' || overdueDays > 0) {
      // Просроченный платеж
      notificationType = 'overdue'
      const clientName = client.fullName || 'Уважаемый клиент'
      // finance.sum хранится в копейках, конвертируем в рубли
      const amountKopecks = parseFloat(finance.sum || '0')
      const amount = amountKopecks / 100
      const dealAid = dataIn.dealAid || finance.fullDaid || 'N/A'

      emailSubject = `Просроченный платеж - ${finance.faid}`
      emailBody = buildPaymentOverdueEmailHtml({
        clientName,
        financeFaid: finance.faid,
        dealAid,
        amount,
        paymentDate: dataIn.paymentDate,
        overdueDays,
      })

      pushTitle = 'Просроченный платеж'
      pushBody = `Платеж ${amount.toFixed(2)} руб. просрочен на ${overdueDays} ${overdueDays === 1 ? 'день' : overdueDays < 5 ? 'дня' : 'дней'}. Произведите оплату.`
    } else if (daysUntilPayment <= daysBeforeThreshold && daysUntilPayment >= 0) {
      // Напоминание о приближающемся платеже
      notificationType = 'reminder'

      // Проверяем, не отправляли ли мы уже напоминание
      if (!forceReminder && dataOut.lastReminderSentAt) {
        const lastReminderDate = new Date(dataOut.lastReminderSentAt)
        const daysSinceLastReminder = Math.ceil(
          (currentDate.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        // Если напоминание было отправлено менее 24 часов назад, пропускаем
        if (daysSinceLastReminder < 1) {
          return {
            sent: false,
            error: 'Reminder was already sent recently',
            notificationType: 'reminder',
            finance,
          }
        }
      }

      const clientName = client.fullName || 'Уважаемый клиент'
      // finance.sum хранится в копейках, конвертируем в рубли
      const amountKopecks = parseFloat(finance.sum || '0')
      const amount = amountKopecks / 100
      const dealAid = dataIn.dealAid || finance.fullDaid || 'N/A'
      const daysText = daysUntilPayment === 0
        ? 'сегодня'
        : daysUntilPayment === 1
        ? 'завтра'
        : `через ${daysUntilPayment} ${daysUntilPayment < 5 ? 'дня' : 'дней'}`

      emailSubject = `Напоминание о платеже - ${finance.faid}`
      emailBody = buildPaymentReminderEmailHtml({
        clientName,
        financeFaid: finance.faid,
        dealAid,
        amount,
        paymentDate: dataIn.paymentDate,
        daysText,
      })

      pushTitle = 'Напоминание о платеже'
      pushBody = `Платеж ${amount.toFixed(2)} руб. необходимо произвести ${daysText}.`
    } else {
      // Платеж слишком далеко в будущем или уже просрочен (но статус еще не OVERDUE)
      return {
        sent: false,
        error: `Payment date is ${daysUntilPayment > daysBeforeThreshold ? 'too far in the future' : 'overdue but status not updated'}`,
        notificationType: daysUntilPayment < 0 ? 'overdue' : 'reminder',
        finance,
      }
    }

    // Отправляем уведомления
    try {
      // Отправляем email
      await noticesRepository.sendEmail(
        dataIn.clientAid,
        emailSubject,
        emailBody
      )

      // Отправляем push-уведомление
      await noticesRepository.sendPushNotification(
        dataIn.clientAid,
        pushTitle,
        pushBody
      )

      // Обновляем lastReminderSentAt в dataOut
      const updatedDataOut: FinanceDataOut = {
        ...dataOut,
        lastReminderSentAt: new Date().toISOString(),
      }

      await this.update(financeUuid, {
        dataOut: updatedDataOut,
      })

      return {
        sent: true,
        notificationType,
        finance: (await this.findByUuid(financeUuid)) as altrpFinance,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to send payment notification:', error)
      return {
        sent: false,
        error: errorMessage,
        notificationType,
        finance,
      }
    }
  }
}

