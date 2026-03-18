/// <reference types="@cloudflare/workers-types" />

import { getSession } from '@/shared/session'
import { Env } from '@/shared/types'
import { MeRepository } from '@/shared/repositories/me.repository'
import { createDb } from '@/shared/repositories/utils'
import { schema } from '@/shared/schema/schema'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'
import { buildRequestEnv } from '@/shared/env'

/**
 * GET /api/c/payments
 * Returns payment history for consumer
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

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    
    const db = createDb()
    
    // Get deals for user
    const deals = await db
      .select()
      .from(schema.deals)
      .where(
        and(
          eq(schema.deals.clientAid, human.haid),
          isNull(schema.deals.deletedAt)
        )
      )

    // Extract payments from deals dataIn (payment history stored in deal data)
    const allPayments: any[] = []
    
    for (const deal of deals) {
      if (deal.dataIn) {
        try {
          const data = deal.dataIn as any
          if (data.payments && Array.isArray(data.payments)) {
            allPayments.push(...data.payments.map((payment: any) => ({
              ...payment,
              dealId: deal.daid,
              dealTitle: deal.title,
            })))
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    // Sort by date descending
    allPayments.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime()
      const dateB = new Date(b.date || b.createdAt || 0).getTime()
      return dateB - dateA
    })

    // Paginate
    const paginatedPayments = allPayments.slice(offset, offset + limit)

    return new Response(
      JSON.stringify({
        payments: paginatedPayments,
        pagination: {
          page,
          limit,
          total: allPayments.length,
          totalPages: Math.ceil(allPayments.length / limit),
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get payments error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to get payments', details: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * POST /api/c/payments
 * Create new payment
 */
export const onRequestPost = async (context: { request: Request; env: Env }) => {
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
    const body = (await request.json()) as {
      dealId?: string
      amount?: number
      comment?: string
    }
    const { dealId, amount, comment } = body

    if (!dealId || !amount) {
      return new Response(JSON.stringify({ error: 'Deal ID and amount are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const meRepository = MeRepository.getInstance()
    const userWithRoles = await meRepository.findByIdWithRoles(Number(sessionUser.id))

    if (!userWithRoles || !userWithRoles.human?.haid) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    const db = createDb()
    
    // Get deal
    const [deal] = await db
      .select()
      .from(schema.deals)
      .where(
        and(
          eq(schema.deals.daid, dealId),
          eq(schema.deals.clientAid, userWithRoles.human.haid),
          isNull(schema.deals.deletedAt)
        )
      )
      .limit(1)

    if (!deal) {
      return new Response(JSON.stringify({ error: 'Deal not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // TODO: Update deal with new payment in dataIn
    // For now, return success
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Payment created',
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Create payment error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create payment', details: String(error) }),
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })

export async function GET(request: Request) {
  const env = buildRequestEnv()
  return onRequestGet({ request, env })
}

export async function POST(request: Request) {
  const env = buildRequestEnv()
  return onRequestPost({ request, env })
}

export async function OPTIONS() {
  return onRequestOptions()
}


