/// <reference types="@cloudflare/workers-types" />

import { Env } from '@/shared/types'
import { SeedRepository } from '@/shared/repositories/seed.repository'
import { seeds, type SeedDefinition } from '@/shared/seeds'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'

type SeedData = {
  [collection: string]: Array<Record<string, unknown> & { uuid: string }>
}

/**
 * GET /api/admin/seed
 * Returns list of all available seed files with metadata
 */
export async function onRequestGet(): Promise<Response> {
  try {
    const seedList = seeds.map((seed) => ({
      id: seed.id,
      name: seed.data.__meta__.name,
      meta: seed.data.__meta__,
    }))

    return new Response(
      JSON.stringify({
        success: true,
        seeds: seedList,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get seed files error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch seed files',
        details: String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * POST /api/admin/seed
 * Body: { seedId: 'system' } - seeds data from specified seed
 */
export async function onRequestPost(context: AuthenticatedRequestContext): Promise<Response> {
  const { request, env } = context

  try {
    const body = (await request.json().catch(() => ({}))) as {
      seedId?: string
    }

    if (!body.seedId) {
      return new Response(
        JSON.stringify({ error: 'seedId is required in request body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Find seed by id
    const seed = seeds.find((s) => s.id === body.seedId)
    if (!seed) {
      return new Response(
        JSON.stringify({
          error: `Seed '${body.seedId}' not found`,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Extract data without __meta__
    const { __meta__, ...seedData } = seed.data
    
    // Use SeedRepository to handle all seeding logic
    const seedRepository = SeedRepository.getInstance()
    const results = await seedRepository.seedMultiple(seedData as SeedData)

    return new Response(
      JSON.stringify({
        success: true,
        seedId: body.seedId,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Seed data error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to seed data',
        details: String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * DELETE /api/admin/seed
 * Body: { seedId: 'system' } - rollbacks (deletes) data from specified seed
 */
export async function onRequestDelete(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context

  try {
    const body = (await request.json().catch(() => ({}))) as {
      seedId?: string
    }

    if (!body.seedId) {
      return new Response(
        JSON.stringify({ error: 'seedId is required in request body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Find seed by id
    const seed = seeds.find((s) => s.id === body.seedId)
    if (!seed) {
      return new Response(
        JSON.stringify({
          error: `Seed '${body.seedId}' not found`,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Extract data without __meta__
    const { __meta__, ...seedData } = seed.data
    
    // Use SeedRepository to handle all rollback logic
    const seedRepository = SeedRepository.getInstance()
    const results = await seedRepository.rollbackMultiple(seedData as SeedData)

    return new Response(
      JSON.stringify({
        success: true,
        seedId: body.seedId,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Rollback data error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to rollback data',
        details: String(error),
      }),
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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })


export const GET = withAdminGuard(onRequestGet)
export const POST = withAdminGuard(onRequestPost)
export const DELETE = withAdminGuard(onRequestDelete)

export async function OPTIONS() {
  return onRequestOptions()
}

