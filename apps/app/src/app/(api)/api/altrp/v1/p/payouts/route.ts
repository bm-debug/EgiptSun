import { withAllowedRoleGuard, withRoleGuard } from '@/shared/api-guard'

const PARTNER_ROLES = ['partner', 'Partner', 'Партнер']

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
} as const

const jsonHeaders = {
  ...corsHeaders,
  'content-type': 'application/json',
} as const

type Payout = {
  id: string
  amount: number
  date: string
  status: string
  description?: string
}

const payouts: Payout[] = [
  {
    id: 'PAY-001',
    amount: 450_000,
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Выплачено',
    description: 'Выплата за одобренные заявки за период 01.01-15.01',
  },
  {
    id: 'PAY-002',
    amount: 320_000,
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Выплачено',
    description: 'Выплата за одобренные заявки за период 16.12-31.12',
  },
  {
    id: 'PAY-003',
    amount: 280_000,
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Выплачено',
    description: 'Выплата за одобренные заявки за период 01.12-15.12',
  },
  {
    id: 'PAY-004',
    amount: 195_000,
    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Выплачено',
    description: 'Выплата за одобренные заявки за период 16.11-30.11',
  },
  {
    id: 'PAY-005',
    amount: 150_000,
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'В обработке',
    description: 'Выплата за одобренные заявки за период 16.01-20.01',
  },
] as const

async function handleGet(): Promise<Response> {
  return new Response(
    JSON.stringify({
      success: true,
      data: { payouts },
    }),
    {
      status: 200,
      headers: jsonHeaders,
    },
  )
}

export const GET = withAllowedRoleGuard(handleGet, PARTNER_ROLES)

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}


