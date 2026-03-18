
import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { LocationsRepository } from '@/shared/repositories/locations.repository'
import { createDb, SiteDbPostgres } from '@/shared/repositories/utils'

/**
 * GET /api/store/v2/m/locations
 * Returns all public locations
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { env } = context

  try {
    // Use repository to fetch all public locations
    const repository = LocationsRepository.getInstance()
    const locations = await repository.getPublicLocations(100)

    // Map locations to simpler format
    const locationsList = locations.map(loc => ({
      laid: loc.laid,
      title: loc.title || loc.laid,
      city: loc.city,
      type: loc.type,
    }))

    return new Response(
      JSON.stringify({
        locations: locationsList,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get locations error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось получить список локаций. Обратитесь к администраторам системы.',
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

