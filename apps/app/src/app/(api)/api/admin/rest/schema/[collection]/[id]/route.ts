import { AuthenticatedRequestContext, withSuperAdminGuard } from '@/shared/api-guard'
import { ALLOWED_ADMIN_COLLECTIONS } from '@/shared/collections'
import { getCollection } from '@/shared/collections/getCollection'
import { getRepository } from '@/shared/repositories/getRepository'
import { i18n } from '@/shared/services/i18n'
import type { DbResult } from '@/shared/types/shared'

const jsonHeaders = { 'content-type': 'application/json' } as const

async function handleGet(context: AuthenticatedRequestContext): Promise<Response> {
  const { params } = context
  const collection = params?.collection as string
  const id = params?.id as string

  if (!collection || !id || !ALLOWED_ADMIN_COLLECTIONS.has(collection)) {
    const msg = await i18n.t('api.rest.invalidCollectionOrId')
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: jsonHeaders,
    })
  }

  try {
    const repo = getRepository(collection)
    const table = repo.schema
    const hasDeletedAt = 'deletedAt' in table

    let entity: any
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    if (isUuid) {
      entity = await repo.findByUuid(id)
    } else {
      entity = await repo.findById(Number(id))
    }

    if (!entity) {
      const msg = await i18n.t('api.rest.notFound')
      return new Response(JSON.stringify({ error: msg }), {
        status: 404,
        headers: jsonHeaders,
      })
    }

    if (hasDeletedAt && (entity as any).deletedAt) {
      const msg = await i18n.t('api.rest.notFound')
      return new Response(JSON.stringify({ error: msg }), {
        status: 404,
        headers: jsonHeaders,
      })
    }

    const collectionConfig = getCollection(collection)
    const processed = { ...entity }
    for (const key of Object.keys(processed)) {
      const fieldConfig = (collectionConfig as any)[key]
      if (fieldConfig?.options?.type === 'json' && processed[key] != null) {
        try {
          const v = processed[key]
          if (typeof v === 'string') processed[key] = JSON.parse(v)
        } catch {
          // keep as is
        }
      }
    }

    const body: DbResult<unknown> = { success: true, doc: processed }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: jsonHeaders,
    })
  } catch (error) {
    console.error('REST schema GET [id] error:', error)
    const msg = await i18n.t('api.rest.queryFailed')
    return new Response(
      JSON.stringify({ error: msg, details: String(error) }),
      { status: 500, headers: jsonHeaders }
    )
  }
}

async function handlePut(context: AuthenticatedRequestContext): Promise<Response> {
  const { params, request } = context
  const collection = params?.collection as string
  const id = params?.id as string

  if (!collection || !id || !ALLOWED_ADMIN_COLLECTIONS.has(collection)) {
    const msg = await i18n.t('api.rest.invalidCollectionOrId')
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: jsonHeaders,
    })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const repo = getRepository(collection)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    const uuid = isUuid ? id : (await repo.findById(Number(id)))?.uuid
    if (!uuid) {
      const msg = await i18n.t('api.rest.notFound')
      return new Response(JSON.stringify({ error: msg }), {
        status: 404,
        headers: jsonHeaders,
      })
    }

    const updated = await repo.update(uuid, body, getCollection(collection) as any)

    const responseBody: DbResult<unknown> = { success: true, doc: updated }
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: jsonHeaders,
    })
  } catch (error) {
    console.error('REST schema PUT error:', error)
    const msg = await i18n.t('api.rest.updateFailed')
    return new Response(
      JSON.stringify({ error: msg, details: String(error) }),
      { status: 500, headers: jsonHeaders }
    )
  }
}

async function handleDelete(context: AuthenticatedRequestContext): Promise<Response> {
  const { params } = context
  const collection = params?.collection as string
  const id = params?.id as string

  if (!collection || !id || !ALLOWED_ADMIN_COLLECTIONS.has(collection)) {
    const msg = await i18n.t('api.rest.invalidCollectionOrId')
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: jsonHeaders,
    })
  }

  try {
    const repo = getRepository(collection)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    let uuid: string
    if (isUuid) {
      uuid = id
    } else {
      const entity = await repo.findById(Number(id))
      if (!entity) {
        const msg = await i18n.t('api.rest.notFound')
        return new Response(JSON.stringify({ error: msg }), {
          status: 404,
          headers: jsonHeaders,
        })
      }
      uuid = (entity as any).uuid
    }

    await repo.deleteByUuid(uuid, false)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: jsonHeaders,
    })
  } catch (error) {
    console.error('REST schema DELETE error:', error)
    const msg = await i18n.t('api.rest.deleteFailed')
    return new Response(
      JSON.stringify({ error: msg, details: String(error) }),
      { status: 500, headers: jsonHeaders }
    )
  }
}

export const GET = withSuperAdminGuard(handleGet)
export const PUT = withSuperAdminGuard(handlePut)
export const PATCH = withSuperAdminGuard(handlePut)
export const DELETE = withSuperAdminGuard(handleDelete)
