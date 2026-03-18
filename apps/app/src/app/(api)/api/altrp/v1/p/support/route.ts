import { withAllowedRoleGuard, withRoleGuard } from '@/shared/api-guard'
import type { RequestContext } from '@/shared/types'

const PARTNER_ROLES = ['partner', 'Partner', 'Партнер']

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
} as const

const jsonHeaders = {
  ...corsHeaders,
  'content-type': 'application/json',
} as const

type Ticket = {
  id: string
  subject: string
  status: string
  createdAt: string
  updatedAt: string
}

let tickets: Ticket[] = [
  {
    id: 'SUP-101',
    subject: 'Вопрос по начислению выплат',
    status: 'Открыт',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'SUP-102',
    subject: 'Не удается скачать договор',
    status: 'В работе',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
] as Ticket[]

async function handleGet(_: RequestContext): Promise<Response> {
  return new Response(
    JSON.stringify({
      success: true,
      data: { tickets },
    }),
    {
      status: 200,
      headers: jsonHeaders,
    },
  )
}

async function handlePost(context: RequestContext): Promise<Response> {
  const { request } = context
  const body = (await request.json().catch(() => null)) as { subject?: string; message?: string } | null

  if (!body?.subject || !body?.message) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Тема и сообщение обязательны',
      }),
      {
        status: 400,
        headers: jsonHeaders,
      },
    )
  }

  const id = `SUP-${Math.floor(Math.random() * 900 + 100)}`
  const now = new Date().toISOString()

  const ticket: Ticket = {
    id,
    subject: body.subject,
    status: 'Открыт',
    createdAt: now,
    updatedAt: now,
  }

  tickets = [ticket, ...tickets]

  return new Response(
    JSON.stringify({
      success: true,
      data: { ticketId: id },
      message: 'Обращение создано',
    }),
    {
      status: 201,
      headers: jsonHeaders,
    },
  )
}

export const GET = withAllowedRoleGuard(handleGet, PARTNER_ROLES)
export const POST = withAllowedRoleGuard(handlePost, PARTNER_ROLES)

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}


