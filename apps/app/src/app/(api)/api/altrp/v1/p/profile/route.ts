import { withAllowedRoleGuard, withRoleGuard } from '@/shared/api-guard'
import type { RequestContext } from '@/shared/types'

const PARTNER_ROLES = ['partner', 'Partner', 'Партнер']

const jsonHeaders = {
  'content-type': 'application/json',
} as const

type PartnerProfile = {
  name: string
  address: string
  inn?: string
  kpp?: string
  ogrn?: string
  bankName?: string
  bankAccount?: string
  correspondentAccount?: string
  bik?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
}

let partnerProfileData: PartnerProfile = {
  name: 'altrp Маркет Казань',
  address: 'г. Казань, ул. Партнерская, 10',
  inn: '1650000000',
  kpp: '165001001',
  ogrn: '1234567890123',
  bankName: 'АО «Банк Партнер»',
  bankAccount: '40702810999900001234',
  correspondentAccount: '30101810000000000225',
  bik: '049205000',
  contactName: 'Иван Сергеевич',
  contactEmail: 'partner@example.com',
  contactPhone: '+7 (900) 000-00-00',
}

async function handleGet(_: RequestContext): Promise<Response> {
  return new Response(
    JSON.stringify({
      success: true,
      profile: partnerProfileData,
    }),
    {
      status: 200,
      headers: jsonHeaders,
    },
  )
}

async function handlePut(context: RequestContext): Promise<Response> {
  const { request } = context
  const body = (await request.json().catch(() => null)) as Partial<PartnerProfile> | null

  if (!body) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Invalid JSON body',
      }),
      {
        status: 400,
        headers: jsonHeaders,
      },
    )
  }

  if (!body.name || !body.address) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Название и адрес обязательны',
      }),
      {
        status: 400,
        headers: jsonHeaders,
      },
    )
  }

  partnerProfileData = {
    ...partnerProfileData,
    ...body,
  }

  return new Response(
    JSON.stringify({
      success: true,
      profile: partnerProfileData,
      message: 'Профиль обновлен',
    }),
    {
      status: 200,
      headers: jsonHeaders,
    },
  )
}

export const GET = withAllowedRoleGuard(handleGet, PARTNER_ROLES)
export const PUT = withAllowedRoleGuard(handlePut, PARTNER_ROLES)


