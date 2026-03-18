import BaseRepository from './BaseRepositroy'
import { schema } from '../schema'
import { NewNotice, Notice } from '../schema/types'
import { generateAid } from '../generate-aid'
import {
  altrpNotice,
  NewaltrpNotice,
  NoticeDataIn,
  PaymentReminderChannel,
} from '../types/altrp-finance'
import { HumanRepository } from './human.repository'
import { sendEmail } from '../services/email.service'
import { buildRequestEnv } from '../env'
import { sendPushNotificationToHuman } from '../utils/push'

export class NoticesRepository extends BaseRepository<Notice> {
  constructor() {
    super(schema.notices)
  }

  public static getInstance(): NoticesRepository {
    return new NoticesRepository()
  }

  protected async beforeCreate(data: Partial<NewaltrpNotice>): Promise<void> {
    if (!data.naid) {
      data.naid = generateAid('n')
    }
    if (typeof data.isRead === 'undefined') {
      data.isRead = false
    }
  }

  protected async beforeUpdate(_: string, data: Partial<NewaltrpNotice>): Promise<void> {
    return
  }

  public async queuePaymentNotice(data: NoticeDataIn): Promise<altrpNotice> {
    let typeName = data.triggerReason
    let title = 'Уведомление'

    const amountVar = data.variables?.find((v) => v.key === 'amount')
    const paymentDateVar = data.variables?.find((v) => v.key === 'paymentDate')
    const overdueDaysVar = data.variables?.find((v) => v.key === 'overdueDays')

    switch (data.triggerReason) {
      case 'PAYMENT_REMINDER':
        title = amountVar && paymentDateVar
          ? `Напоминание: платеж ${amountVar.value} руб. до ${paymentDateVar.value}`
          : 'Напоминание о предстоящем платеже'
        typeName = 'PAYMENT_REMINDER'
        break
      case 'PAYMENT_RECEIVED':
        title = 'Платеж получен'
        typeName = 'PAYMENT_RECEIVED'
        break
      case 'DEBT_COLLECTION':
        title = amountVar && overdueDaysVar
          ? `Просрочка платежа: ${amountVar.value} руб. (${overdueDaysVar.value} дней)`
          : 'Уведомление о просрочке'
        typeName = 'DEBT_COLLECTION'
        break
      case 'DEAL_STATUS':
        title = 'Изменение статуса сделки'
        typeName = 'DEAL_STATUS'
        break
      default:
        title = 'Уведомление'
        typeName = 'CUSTOM'
    }

    const targetAid = data.variables?.find((v) => v.key === 'clientAid')?.value as string | undefined

    const createdNotice = (await this.create({
      uuid: crypto.randomUUID(),
      naid: generateAid('n'),
      targetAid,
      title,
      isRead: 0,
      typeName,
      order: '0',
      dataIn: data,
    })) as altrpNotice

    return createdNotice
  }

  public async createPaymentReminder(
    channel: PaymentReminderChannel,
    clientAid: string,
    dealAid: string,
    financeFaid: string,
    amount: number,
    paymentDate: string,
    daysBefore: number
  ): Promise<altrpNotice> {
    return this.queuePaymentNotice({
      channel,
      templateKey: `payment_reminder_${daysBefore}_days`,
      variables: [
        { key: 'clientAid', value: clientAid },
        { key: 'dealAid', value: dealAid },
        { key: 'financeFaid', value: financeFaid },
        { key: 'amount', value: amount },
        { key: 'paymentDate', value: paymentDate },
        { key: 'daysBefore', value: daysBefore },
      ],
      relatedDealAid: dealAid,
      relatedFinanceFaid: financeFaid,
      triggeredBy: 'SYSTEM',
      triggerReason: 'PAYMENT_REMINDER',
    })
  }

  public async createOverdueNotice(
    channel: PaymentReminderChannel,
    clientAid: string,
    dealAid: string,
    financeFaid: string,
    amount: number,
    overdueDays: number
  ): Promise<altrpNotice> {
    return this.queuePaymentNotice({
      channel,
      templateKey: 'payment_overdue',
      variables: [
        { key: 'clientAid', value: clientAid },
        { key: 'dealAid', value: dealAid },
        { key: 'financeFaid', value: financeFaid },
        { key: 'amount', value: amount },
        { key: 'overdueDays', value: overdueDays },
      ],
      relatedDealAid: dealAid,
      relatedFinanceFaid: financeFaid,
      triggeredBy: 'SYSTEM',
      triggerReason: 'DEBT_COLLECTION',
    })
  }
  public async sendEmail(haid: string, subject: string, body: string): Promise<Notice> {
    const humanRepository = HumanRepository.getInstance()
    const human = await humanRepository.findByHaid(haid)
    if (!human) {
      throw new Error('Human not found')
    }

    const email = human.email as string
    if (!email) {
      throw new Error('Email not found')
    }

    // Send email
    let emailSent = false
    let emailError: string | null = null
    try {
      await sendEmail(buildRequestEnv(), {
        to: email,
        subject: subject,
        html: body,
        text: body.replace(/<[^>]*>/g, '').trim(),
      })
      emailSent = true
    } catch (error) {
      emailError = error instanceof Error ? error.message : String(error)
      console.error('Failed to send email:', error)
      // Continue to save notice even if email fails
    }

    // Create notice record
    const noticeData: NewNotice = {
      uuid: crypto.randomUUID(),
      naid: generateAid('n'),
      targetAid: haid,
      title: subject,
      isRead: false,
      typeName: 'email',
      order: '0',
      dataIn: {
        email,
        body,
        sent: emailSent,
        error: emailError,
      },
    }

    const notice = await this.create(noticeData)
    return notice
  }

  public async sendPushNotification(haid: string, title: string, body: string, url?: string): Promise<Notice> {
    // Send push notification
    let pushSent = false
    let pushError: string | null = null
    let pushResult: any = null

    try {
      pushResult = await sendPushNotificationToHuman({
        haid,
        title,
        body,
        url,
        context: { env: buildRequestEnv() },
      })
      pushSent = true
    } catch (error) {
      pushError = error instanceof Error ? error.message : String(error)
      console.error('Failed to send push notification:', error)
      // Continue to save notice even if push fails
    }

    // Create notice record
    const noticeData: NewNotice = {
      uuid: crypto.randomUUID(),
      naid: generateAid('n'),
      targetAid: haid,
      title: title,
      isRead: false,
      typeName: 'push',
      order: '0',
      dataIn: {
        body,
        sent: pushSent,
        error: pushError,
        result: pushResult,
      },
    }

    const notice = await this.create(noticeData)
    return notice
  }
}

