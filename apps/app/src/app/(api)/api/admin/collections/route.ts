/// <reference types="@cloudflare/workers-types" />

import { withEditorGuard } from '@/shared/api-guard'
import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { COLLECTION_GROUPS } from '@/shared/collections'
import { RoleCollectionSchemaService } from '@/shared/services/role-collection-schema.service'
import { getPostgresClient, executeRawQuery, createDb } from '@/shared/repositories/utils'

interface TableInfo {
  table_name: string
  table_type: string
}

interface CollectionGroup {
  category: string
  collections: string[]
}

const DEFAULT_EDITOR_GROUPS: CollectionGroup[] = [
  { category: 'Sales', collections: ['deals'] },
]

/**
 * GET /api/admin/collections
 * Returns collections. For Administrator: all from COLLECTION_GROUPS. For Editor: from role_schema_Editor or default.
 */
async function handleGet(context: AuthenticatedRequestContext): Promise<Response> {
  try {
    const isAdmin = context.user.roles.some((r: any) => r.name === 'Administrator')
    let grouped: CollectionGroup[]

    if (isAdmin) {
      const db = createDb()
      const client = getPostgresClient(db)
      const tablesResult = await executeRawQuery<TableInfo>(
        client,
        `SELECT table_name, table_type 
         FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_type = 'BASE TABLE'
         AND table_name NOT LIKE 'sqlite_%' 
         AND table_name NOT LIKE 'd1_%'
         AND table_name NOT LIKE '_migrations'
         ORDER BY table_name`
      )
      if (!tablesResult) {
        return new Response(JSON.stringify({ error: 'Failed to fetch tables' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
      }
      const tableNames = new Set(tablesResult.map((t: TableInfo) => t.table_name))
      grouped = []
      for (const [category, collections] of Object.entries(COLLECTION_GROUPS)) {
        const found = collections.filter((name) => tableNames.has(name))
        if (found.length > 0) grouped.push({ category, collections: found })
      }
    } else {
      const schemaService = RoleCollectionSchemaService.getInstance()
      const editorCollections = await schemaService.getCollectionsForRole('Editor')
      if (editorCollections.length > 0) {
        grouped = [{ category: 'Editor', collections: editorCollections }]
      } else {
        grouped = DEFAULT_EDITOR_GROUPS
      }
    }

    return new Response(
      JSON.stringify({ success: true, total: grouped.reduce((s, g) => s + g.collections.length, 0), groups: grouped }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Get collections error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch collections', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const GET = withEditorGuard(handleGet)

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })

export async function OPTIONS() {
  return onRequestOptions()
}

