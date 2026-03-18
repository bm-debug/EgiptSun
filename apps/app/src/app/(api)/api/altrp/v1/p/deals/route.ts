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

type Deal = {
  id: string
  uuid: string
  clientName: string
  productName: string
  amount: number
  status: string
  createdAt: string
}

let partnerDeals: Deal[] = [
  {
    id: 'APP-001',
    uuid: 'uuid-001',
    clientName: 'Иванов Иван Иванович',
    productName: 'Смартфон Samsung Galaxy S24',
    amount: 150_000,
    status: 'Одобрена',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'APP-002',
    uuid: 'uuid-002',
    clientName: 'Петрова Мария Сергеевна',
    productName: 'Ноутбук ASUS VivoBook',
    amount: 85_000,
    status: 'На рассмотрении',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'APP-003',
    uuid: 'uuid-003',
    clientName: 'Сидоров Петр Александрович',
    productName: 'Телевизор LG OLED 55"',
    amount: 200_000,
    status: 'Одобрена',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'APP-004',
    uuid: 'uuid-004',
    clientName: 'Козлова Анна Дмитриевна',
    productName: 'Холодильник Bosch',
    amount: 120_000,
    status: 'Одобрена',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'APP-005',
    uuid: 'uuid-005',
    clientName: 'Морозов Дмитрий Викторович',
    productName: 'Стиральная машина Indesit',
    amount: 95_000,
    status: 'Отклонена',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
] as Deal[]

async function handleGet(_: RequestContext): Promise<Response> {
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        deals: partnerDeals,
      },
    }),
    {
      status: 200,
      headers: jsonHeaders,
    },
  )
}

async function handlePost(context: RequestContext): Promise<Response> {
  const { request } = context
  const formData = await request.formData()
  const payloadRaw = formData.get('payload')

  if (!payloadRaw || typeof payloadRaw !== 'string') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Invalid payload',
      }),
      {
        status: 400,
        headers: jsonHeaders,
      },
    )
  }

  const payload = JSON.parse(payloadRaw) as Record<string, unknown>

  const requiredFields = ['firstName', 'lastName', 'phoneNumber', 'purchasePrice', 'downPayment', 'installmentTerm']
  const missingField = requiredFields.find((field) => !payload[field])
  const consentGiven = payload.consentToProcessData === true || payload.consentToProcessData === 'true'

  if (missingField || !consentGiven) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'BAD_REQUEST',
        message: missingField
          ? `Поле ${missingField} обязательно`
          : 'Необходимо согласие на обработку персональных данных',
      }),
      {
        status: 400,
        headers: jsonHeaders,
      },
    )
  }

  const id = `APP-${String(partnerDeals.length + 1).padStart(3, '0')}`
  const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `uuid-${Date.now()}`

  const amount = Number(payload.purchasePrice) || 0
  const clientName = `${payload.lastName ?? ''} ${payload.firstName ?? ''}`.trim()
  const productName = (payload.productName as string | undefined) || 'Товар не указан'

  const newDeal: Deal = {
    id,
    uuid,
    clientName: clientName || 'Клиент',
    productName,
    amount,
    status: 'На рассмотрении',
    createdAt: new Date().toISOString(),
  }

  partnerDeals = [newDeal, ...partnerDeals]

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        deal: newDeal,
      },
      message: 'Заявка создана и отправлена на рассмотрение',
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


