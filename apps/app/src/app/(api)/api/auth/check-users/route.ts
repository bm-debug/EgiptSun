import { createDb } from '@/shared/repositories/utils'
import { schema } from '@/shared/schema/schema'
import { sql } from 'drizzle-orm'
/**
 * GET /api/auth/check-users
 * Checks if any users exist in the database
 */
export async function GET() {
  try {
    const db = createDb()

    const [{ count = 0 } = {}] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(schema.users)
      .where(sql`${schema.users.deletedAt} IS NULL`)
      .limit(1)
    const normalizedCount = Number(count) || 0
    const hasUsers = normalizedCount > 0

    return new Response(
      JSON.stringify({ hasUsers, count: normalizedCount }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Check users error:', error)
    return new Response(
      JSON.stringify({ error: 'Database error', details: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
