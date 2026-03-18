/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { DealsRepository } from '@/shared/repositories/deals.repository'

/**
 * POST /api/store/v2/m/deals
 * Body: { action: 'confirm', fullDaid?: string, daid?: string }
 */
async function handlePost(context: AuthenticatedRequestContext) {
  const { request, env } = context

  try {
    const body = await request.json().catch(() => ({})) as {
      action?: string
      fullDaid?: string
      daid?: string
    }

    if (!body || body.action !== 'confirm') {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use action="confirm".' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (!body.fullDaid && !body.daid) {
      return new Response(
        JSON.stringify({ error: 'Provide fullDaid or daid.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const repository = DealsRepository.getInstance()
    const result = await repository.confirm({ fullDaid: body.fullDaid, daid: body.daid })

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Deal not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Deals POST error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process request', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

export const POST = withManagerGuard(handlePost)

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

