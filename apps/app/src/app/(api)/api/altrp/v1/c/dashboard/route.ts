/// <reference types="@cloudflare/workers-types" />

import { getSession } from '@/shared/session'
import { Env } from '@/shared/types'
import { MeRepository } from '@/shared/repositories/me.repository'
import { createDb } from '@/shared/repositories/utils'
import { schema } from '@/shared/schema/schema'
import { eq, and, desc, isNull, sql } from 'drizzle-orm'
import { buildRequestEnv } from '@/shared/env'

/**
 * GET /api/c/dashboard
 * Returns dashboard statistics for consumer
 */
export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const { request, env } = context

  if (!env.AUTH_SECRET) {
    return new Response(JSON.stringify({ error: 'Authentication not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const sessionUser = await getSession(request, env.AUTH_SECRET)

  if (!sessionUser) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const meRepository = MeRepository.getInstance()
    const userWithRoles = await meRepository.findByIdWithRoles(Number(sessionUser.id))

    if (!userWithRoles) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { human } = userWithRoles
    
    if (!human?.haid) {
      return new Response(JSON.stringify({ error: 'Human profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    const db = createDb()
    
    // Get approved deals (statusName = 'APPROVED')
    const approvedDeals = await db
      .select()
      .from(schema.deals)
      .where(
        and(
          eq(schema.deals.clientAid, human.haid),
          isNull(schema.deals.deletedAt),
          eq(schema.deals.statusName, 'APPROVED')
        )
      )
    
    const activeDealsCount = approvedDeals.length

    // Get finances for approved deals to calculate next payment and total debt
    let nextPayment: { amount: number; date: string } | null = null
    let totalDebt = 0
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    for (const deal of approvedDeals) {
      let hasOutstandingFinances = false

      // 1. Primary source of truth – finances table
      if (deal.daid) {
        try {
          const finances = await db
            .select()
            .from(schema.finances)
            .where(
              and(
                eq(schema.finances.fullDaid, deal.daid),
                isNull(schema.finances.deletedAt)
              )
            )
            .orderBy(schema.finances.order)
            .execute()

          for (const finance of finances) {
            const dataIn =
              typeof finance.dataIn === 'string'
                ? JSON.parse(finance.dataIn)
                : finance.dataIn

            const statusName = finance.statusName
            const paymentDateStr: string | undefined = dataIn?.paymentDate

            // Пропускаем платежи без даты
            if (!paymentDateStr) {
              continue
            }

            // Пропускаем уже оплаченные платежи из расчета следующего платежа и долга
            if (statusName === 'PAID') {
              continue
            }

            hasOutstandingFinances = true

            // finance.sum хранится в копейках, конвертируем в рубли
            const amountKopecks = parseFloat(finance.sum || '0') || 0
            const amount = amountKopecks / 100
            const paymentDate = new Date(paymentDateStr)
            paymentDate.setHours(0, 0, 0, 0)

            // Учитываем этот платеж в общем долге
            totalDebt += amount

            // Ищем ближайший будущий платеж
            if (paymentDate >= now) {
              if (!nextPayment || paymentDate < new Date(nextPayment.date)) {
                nextPayment = {
                  amount,
                  date: paymentDateStr,
                }
              }
            }
          }
        } catch (e) {
          console.error('Error fetching finances for dashboard:', e)
        }
      }

      // Если по сделке есть финансы (PENDING/OVERDUE), считаем, что они — источник истины
      // и не используем paymentSchedule/цену товара
      if (hasOutstandingFinances) {
        continue
      }

      // 2. Фоллбэк: пробуем взять график из dataIn, если по сделке ещё нет записей в finances
      let paymentSchedule: Array<{ date: string; amount: number; status?: string }> | null = null

      if (deal.dataIn) {
        try {
          const dataIn = typeof deal.dataIn === 'string' ? JSON.parse(deal.dataIn) : deal.dataIn
          if (dataIn.paymentSchedule && Array.isArray(dataIn.paymentSchedule)) {
            paymentSchedule = dataIn.paymentSchedule
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      if (paymentSchedule && Array.isArray(paymentSchedule)) {
        for (const payment of paymentSchedule) {
          if (payment.status !== 'Оплачен' && payment.date) {
            const paymentDate = new Date(payment.date)
            paymentDate.setHours(0, 0, 0, 0)

            // Add to total debt
            totalDebt += payment.amount || 0

            // Check if this is the next payment
            if (paymentDate >= now) {
              if (!nextPayment || paymentDate < new Date(nextPayment.date)) {
                nextPayment = {
                  amount: payment.amount || 0,
                  date: payment.date,
                }
              }
            }
          }
        }
      } else {
        // 3. Если нет ни finances, ни графика — считаем долг равным стоимости товара
        try {
          const dataIn = typeof deal.dataIn === 'string' ? JSON.parse(deal.dataIn) : deal.dataIn
          const price = parseFloat(dataIn?.productPrice || dataIn?.purchasePrice || '0')
          totalDebt += price
        } catch (e) {
          // Ignore
        }
      }
    }

    // Get last loan application (only 1)
    const recentDeals = await db
      .select()
      .from(schema.deals)
      .where(
        and(
          eq(schema.deals.clientAid, human.haid),
          isNull(schema.deals.deletedAt),
          sql`${schema.deals.dataIn}::jsonb->>'type' = 'LOAN_APPLICATION'`
        )
      )
      .orderBy(desc(schema.deals.createdAt))
      .limit(1)

    const stats = {
      activeDealsCount,
      totalDebt,
      nextPayment,
      recentDeals: recentDeals.map((deal: any) => ({
        id: deal.daid,
        uuid: deal.uuid,
        title: deal.title || 'Без названия',
        status: deal.statusName,
        createdAt: deal.createdAt,
        dataIn: deal.dataIn ? deal.dataIn : null,
      })),
    }

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to load dashboard data', details: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })

export async function GET(request: Request) {
  const env = buildRequestEnv()
  return onRequestGet({ request, env })
}

export async function OPTIONS() {
  return onRequestOptions()
}


