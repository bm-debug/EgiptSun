/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { ContractorsRepository } from '@/shared/repositories/contractors.repository'

/**
 * GET /api/store/v2/m/contractors
 * Returns active contractors for selection
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { request, env } = context

  try {
    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('statusName') || url.searchParams.get('status') || 'ACTIVE'
    const limit = Math.max(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 1)

    // Use repository to fetch data
    const repository = ContractorsRepository.getInstance()
    const contractors = statusFilter === 'ACTIVE' 
      ? await repository.getActiveContractors(limit)
      : await repository.getAllContractors(limit)

    // Format for select/options
    const options = contractors.map((contractor) => ({
      value: contractor.caid || contractor.uuid,
      label: contractor.title || contractor.caid || contractor.uuid,
      caid: contractor.caid,
      uuid: contractor.uuid,
      title: contractor.title,
      status_name: contractor.statusName,  
    }))

    return new Response(
      JSON.stringify({
        success: true,
        docs: options,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get contractors error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось получить список контракторов',
        details: String(error) 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const GET = withManagerGuard(handleGet)

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

