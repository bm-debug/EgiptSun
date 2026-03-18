import { AuthenticatedRequestContext, withSuperAdminGuard } from '@/shared/api-guard'
import { RoleCollectionSchemaService } from '@/shared/services/role-collection-schema.service'
import type { RoleSchemaDataIn } from '@/shared/types/role-schema-settings'
import type { DbResult } from '@/shared/types/shared'

const jsonHeaders = { 'content-type': 'application/json' } as const

async function handlePut(context: AuthenticatedRequestContext): Promise<Response> {
  const { request, user } = context

  try {
    const body = (await request.json()) as { uuid?: string; dataIn?: RoleSchemaDataIn }
    const { uuid, dataIn } = body

    if (!uuid || typeof uuid !== 'string') {
      return new Response(
        JSON.stringify({ error: 'uuid is required' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    if (!dataIn || typeof dataIn !== 'object') {
      return new Response(
        JSON.stringify({ error: 'dataIn is required' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    const service = RoleCollectionSchemaService.getInstance()
    const userId = user?.id ?? null
    const setting = await service.saveRoleSchemaSettings(uuid, dataIn, userId)

    const responseBody: DbResult<unknown> = { success: true, doc: setting }
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: jsonHeaders,
    })
  } catch (error) {
    console.error('Role schema settings PUT error:', error)
    return new Response(
      JSON.stringify({ error: 'Update failed', details: String(error) }),
      { status: 500, headers: jsonHeaders }
    )
  }
}

export const PUT = withSuperAdminGuard(handlePut)
