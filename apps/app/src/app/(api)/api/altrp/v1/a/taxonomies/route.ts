import qs from 'qs'
import type { DbFilters, DbOrders, DbPagination, DbPaginatedResult } from '@/shared/types/shared'
import { TaxonomyRepository } from '@/shared/repositories/taxonomy.repository'
import type { Taxonomy } from '@/shared/schema/types'
import { withAdministratorGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { NextResponse } from 'next/server'

async function handleGet(context: AuthenticatedRequestContext) {
    const { request } = context
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
                return NextResponse.json(
                    {
                        error: 'INVALID_FILTERS',
                        message: 'Unable to parse filters parameter',
                    },
                    { status: 400 }
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

        return NextResponse.json(response)
    } catch (error) {
        console.error('Failed to load taxonomy list', error)
        return NextResponse.json(
            {
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to load taxonomy list',
            },
            { status: 500 }
        )
    }
}

async function handlePost(context: AuthenticatedRequestContext) {
    const { request } = context
    try {
        const body = await request.json() as {
            entity: string
            name: string
            title?: string | null
            sortOrder?: number | null
        }

        if (!body.entity || !body.name) {
            return NextResponse.json(
                {
                    error: 'VALIDATION_ERROR',
                    message: 'Entity and name are required',
                },
                { status: 400 }
            )
        }

        const taxonomyRepository = new TaxonomyRepository()
        const created = await taxonomyRepository.create({
            entity: body.entity,
            name: body.name,
            title: body.title || null,
            sortOrder: body.sortOrder?.toString() || '0',
        })

        return NextResponse.json(created, { status: 201 })
    } catch (error) {
        console.error('Failed to create taxonomy', error)
        return NextResponse.json(
            {
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create taxonomy',
            },
            { status: 500 }
        )
    }
}

export const GET = withAdministratorGuard(handleGet)
export const POST = withAdministratorGuard(handlePost)

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    })
}
