import qs from 'qs'
import type { Env } from '@/shared/types'
import { DealsRepository } from '@/shared/repositories/deals.repository'
import { MeRepository } from '@/shared/repositories/me.repository'
import type { DbFilters, DbOrders, DbPagination, DbPaginatedResult } from '@/shared/types/shared'
import type { LoanApplication, LoanApplicationDataIn } from '@/shared/types/altrp'
import type { Deal } from '@/shared/schema/types'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { getPostgresClient, executeRawQuery } from '@/shared/repositories/utils'

const onRequestGet = async (context: AuthenticatedRequestContext) => {
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

        // Extract search parameter
        const searchQuery = parsed.search ? String(parsed.search).trim() : ''

        const dealsRepository = new DealsRepository()
        
        // Extract managerUuid filter if present
        let managerUuidFilter: string | undefined
        const managerFilterCondition = filters?.conditions?.find(
            (cond) => cond.field === 'managerUuid' || cond.field === 'dataIn.managerUuid'
        )
        if (managerFilterCondition && managerFilterCondition.values && managerFilterCondition.values.length > 0) {
            managerUuidFilter = String(managerFilterCondition.values[0])
        }

        // Use single LIKE pattern for type to avoid SQLite complexity error
        // We'll filter by managerUuid after fetching the data
        const combinedFilters: DbFilters = {
            conditions: [
                ...(filters?.conditions?.filter(
                    (cond) => cond.field !== 'managerUuid' && cond.field !== 'dataIn.managerUuid'
                ) ?? []),
                {
                    field: 'dataIn',
                    operator: 'like',
                    values: ['%"type":"LOAN_APPLICATION"%'],
                },
            ],
        }

        // Use repository method with search if search query exists, otherwise use regular method
        const dealsResult = searchQuery
            ? await dealsRepository.getDealsWithSearch({
                searchQuery,
                filters: combinedFilters,
                orders,
                pagination,
            })
            : await dealsRepository.getDeals({
                filters: combinedFilters,
                orders,
                pagination,
            })

        let applications: LoanApplication[] = dealsResult.docs
            .map((deal) => {
                let dataIn: unknown = deal.dataIn

                if (typeof dataIn === 'string') {
                    try {
                        dataIn = JSON.parse(dataIn) as LoanApplicationDataIn
                    } catch {
                        dataIn = null
                    }
                }

                if (!dataIn || (dataIn as LoanApplicationDataIn).type !== 'LOAN_APPLICATION') {
                    return null
                }

                return {
                    ...deal,
                    dataIn,
                } as LoanApplication
            })
            .filter((deal): deal is LoanApplication => deal !== null)

        // Filter by managerUuid if specified (after parsing JSON to avoid SQLite LIKE complexity)
        if (managerUuidFilter) {
            applications = applications.filter(
                (app) => (app.dataIn as LoanApplicationDataIn)?.managerUuid === managerUuidFilter
            )
        }

        // Load manager information for each application
        const meRepository = MeRepository.getInstance()
        const applicationsWithManagers = await Promise.all(
            applications.map(async (app) => {
                const managerUuid = (app.dataIn as LoanApplicationDataIn)?.managerUuid
                let managerName: string | null = null

                if (managerUuid) {
                    try {
                        // В среде Next.js на проде нет env.DB (это binding Cloudflare),
                        // поэтому при его отсутствии просто пропускаем загрузку менеджера
                        if (env && (env as any).DB) {
                            // Find user by UUID через прямой запрос в Postgres
                            const client = getPostgresClient((env as any).DB)
                            const userResult = await executeRawQuery<{ id: number }>(
                                client,
                                'SELECT id FROM users WHERE uuid = $1 AND deleted_at IS NULL LIMIT 1',
                                [managerUuid]
                            )

                            const user = userResult[0]

                            if (user) {
                                const userWithRoles = await meRepository.findByIdWithRoles(Number(user.id), {
                                    includeHuman: true,
                                })
                                if (userWithRoles?.human) {
                                    managerName = userWithRoles.human.fullName || null
                                }
                                // If no fullName, use email as fallback
                                if (!managerName && userWithRoles?.user?.email) {
                                    managerName = userWithRoles.user.email
                                }
                            }
                        } else {
                            console.warn(
                                `DB binding is not available in env, skipping manager lookup for application ${app.uuid}`
                            )
                        }
                    } catch (err) {
                        console.error(`Failed to load manager for application ${app.uuid}:`, err)
                    }
                }

                return {
                    ...app,
                    managerName,
                }
            })
        )

        const response: DbPaginatedResult<LoanApplication & { managerName?: string | null }> = {
            docs: applicationsWithManagers,
            pagination: dealsResult.pagination,
        }

        return new Response(JSON.stringify(response), {
            headers: {
                'Content-Type': 'application/json',
            },
        })
    } catch (error) {
        console.error('Failed to load loan applications', error)
        return new Response(
            JSON.stringify({
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to load loan applications',
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

export const GET = withAdminGuard(onRequestGet)

export async function OPTIONS() {
    return onRequestOptions()
}