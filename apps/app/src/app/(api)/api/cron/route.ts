import { NextResponse } from 'next/server'
import { FinancesRepository } from '@/shared/repositories/finances.repository'

/**
 * Cron job endpoint для проверки просроченных платежей
 * 
 * Защита от несанкционированного доступа:
 * - Используйте секретный ключ в заголовке Authorization
 * - Или проверяйте IP-адрес источника запроса
 * - Или используйте переменную окружения CRON_SECRET
 * 
 * Рекомендуемый расписание: каждый день в 00:00 или 09:00
 * Пример cron: 0 0 * * * (каждый день в полночь)
 */

export async function GET(request: Request) {
  // Проверка секретного ключа из переменных окружения
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Или проверка через специальный заголовок (если используете Vercel Cron)
  const cronHeader = request.headers.get('x-vercel-cron')
  if (!cronHeader && !cronSecret) {
    // Для внешних cron сервисов требуем секрет
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    console.log('Cron job: Checking overdue payments at', new Date().toISOString())
    
    // Проверяем и отмечаем просроченные платежи
    const financesRepository = FinancesRepository.getInstance()
    const overduePayments = await financesRepository.checkAndMarkOverduePayments()
    
    console.log(`Found ${overduePayments.length} overdue payments`)
    
    // Отправляем уведомления по каждому просроченному платежу
    const notificationResults = []
    for (const finance of overduePayments) {
      try {
        const result = await financesRepository.sendPaymentNotification(finance.uuid)
        notificationResults.push({
          financeUuid: finance.uuid,
          financeFaid: finance.faid,
          sent: result.sent,
          error: result.error,
          notificationType: result.notificationType,
        })
        
        if (result.sent) {
          console.log(`Notification sent for finance ${finance.faid}`)
        } else {
          console.warn(`Failed to send notification for finance ${finance.faid}:`, result.error)
        }
      } catch (error) {
        console.error(`Error sending notification for finance ${finance.faid}:`, error)
        notificationResults.push({
          financeUuid: finance.uuid,
          financeFaid: finance.faid,
          sent: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Также проверяем платежи, которые приближаются (для напоминаний)
    // Это можно сделать в отдельном cron job или здесь
    // Для простоты оставляем только проверку просроченных

    return NextResponse.json({
      success: true,
      message: 'Cron job executed successfully',
      timestamp: new Date().toISOString(),
      overduePaymentsCount: overduePayments.length,
      overduePayments: overduePayments.map(f => ({
        uuid: f.uuid,
        faid: f.faid,
        status: f.statusName,
      })),
      notificationsSent: notificationResults.filter(r => r.sent).length,
      notificationsFailed: notificationResults.filter(r => !r.sent).length,
      notificationResults,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Также можно использовать POST метод
export async function POST(request: Request) {
  return GET(request)
}

