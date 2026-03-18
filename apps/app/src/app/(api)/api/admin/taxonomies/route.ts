import qs from 'qs'
import type { Env } from '@/shared/types'
import type { DbFilters, DbOrders, DbPagination, DbPaginatedResult } from '@/shared/types/shared'
import { TaxonomyRepository } from '@/shared/repositories/taxonomy.repository'
import type { Taxonomy } from '@/shared/schema/types'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'

export const onRequestGet = async (context: AuthenticatedRequestContext) => {
    const { request, env } = context
    try {
        const url = new URL(request.url)
        const parsed = qs.parse(url.search, { ignoreQueryPrefix: true })

        let filters: DbFilters | undefined
        if (parsed.filters) {
            try {
                filters = typeof parsed.filters === 'string'
                    ? (JSON.parse(parsed.filters) as DbFilters)
                    : (parsed.filters as DbFilters)
            } catch (error) {
                return new Response(
                    JSON.stringify({
                        error: 'INVALID_FILTERS',
                        message: 'Unable to parse filters parameter',
                    }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } },
                )
            }
        }

        let orders: DbOrders | undefined
        if (parsed.orders) {
            orders = typeof parsed.orders === 'string'
                ? (JSON.parse(parsed.orders) as DbOrders)
                : (parsed.orders as DbOrders)
        }

        const pagination: DbPagination = {
            page: parsed.page ? Number(parsed.page) : undefined,
            limit: parsed.limit ? Number(parsed.limit) : undefined,
        }

        const taxonomyRepository = new TaxonomyRepository()
        const result = await taxonomyRepository.getTaxonomies({
            filters,
            orders,
            pagination,
        })

        const response: DbPaginatedResult<Taxonomy> = {
            docs: result.docs,
            pagination: result.pagination,
        }

        return new Response(JSON.stringify(response), {
            headers: {
                'Content-Type': 'application/json',
            },
        })
    } catch (error) {
        console.error('Failed to load taxonomy list', error)
        return new Response(
            JSON.stringify({
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to load taxonomy list',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        )
    }
}

export const onRequestOptions = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    })
}

const onRequestPost = async (context: AuthenticatedRequestContext) => {
    const { request } = context
    try {
        const body = await request.json() as {
            entity: string
            name: string
            title?: string | null
            sortOrder?: number | null
        }

        if (!body.entity || !body.name) {
            return new Response(
                JSON.stringify({
                    error: 'VALIDATION_ERROR',
                    message: 'Entity and name are required',
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
        }

        const taxonomyRepository = new TaxonomyRepository()
        const created = await taxonomyRepository.create({
            entity: body.entity,
            name: body.name,
            title: body.title || null,
            sortOrder: body.sortOrder?.toString() || '0',
        })

        return new Response(JSON.stringify(created), {
            status: 201,
            headers: {
                'Content-Type': 'application/json',
            },
        })
    } catch (error) {
        console.error('Failed to create taxonomy', error)
        return new Response(
            JSON.stringify({
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create taxonomy',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        )
    }
}

export const GET = withAdminGuard(onRequestGet)
export const POST = withAdminGuard(onRequestPost)

export async function OPTIONS() {
    return onRequestOptions()
}