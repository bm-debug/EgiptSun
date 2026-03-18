import { NextRequest, NextResponse } from 'next/server'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { DealsRepository } from '@/shared/repositories/deals.repository'
import { FinancesRepository } from '@/shared/repositories/finances.repository'
import { UsersRepository } from '@/shared/repositories/users.repository'
import { LoanApplication } from '@/shared/types/altrp'

interface DashboardMetrics {
  newApplicationsToday: number
  newApplicationsPeriod: number
  scoringAmount: number
  overdueCount: number
  investorPortfolio: number
  applicationsByManager: Array<{ manager: string; count: number }>
}

const handleGet = async (
  context: AuthenticatedRequestContext,
  request: NextRequest
): Promise<Response> => {
  try {
    const url = new URL(request.url)
    const startDateParam = url.searchParams.get('startDate')
    const endDateParam = url.searchParams.get('endDate')

    // Default to last 30 days if not provided
    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(new Date().setDate(new Date().getDate() - 30))

    // Start and end of today for "today" calculations
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const dealsRepo = DealsRepository.getInstance()
    const financesRepo = FinancesRepository.getInstance()
    const usersRepo = UsersRepository.getInstance()

    // Get all deals (we'll filter by type manually since dataIn.type is a JSON field)
    const allDealsResult = await dealsRepo.getDeals({
      pagination: {
        limit: 10000, // Get all deals
        page: 1,
      },
    })

    // Filter only loan applications
    const allDeals = allDealsResult.docs.filter((deal) => {
      const dataIn = typeof deal.dataIn === 'string' 
        ? JSON.parse(deal.dataIn) 
        : (deal.dataIn as Record<string, unknown> | null)
      return dataIn?.type === 'LOAN_APPLICATION'
    }) as LoanApplication[]

    // 1. Новых заявок сегодня
    const newApplicationsToday = allDeals.filter((deal) => {
      const createdAt = new Date(deal.createdAt || '')
      return createdAt >= todayStart && createdAt <= todayEnd
    }).length

    // 2. Новых заявок за период
    const newApplicationsPeriod = allDeals.filter((deal) => {
      const createdAt = new Date(deal.createdAt || '')
      return createdAt >= startDate && createdAt <= endDate
    }).length

    // 3. Сумма на скоринге (deals со статусом NEW или SCORING)
    const scoringDeals = allDeals.filter(
      (deal) => deal.statusName === 'NEW' || deal.statusName === 'SCORING'
    )
    let scoringAmount = 0
    for (const deal of scoringDeals) {
      const productPrice = deal.dataIn?.productPrice
      if (productPrice) {
        const price = typeof productPrice === 'string' 
          ? Number(productPrice.replace(/[^\d.-]/g, '')) 
          : Number(productPrice)
        if (Number.isFinite(price)) {
          scoringAmount += price
        }
      }
    }

    // 4. Количество просрочек (finances со статусом PENDING и paymentDate < сегодня)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const allFinances = await financesRepo.findAll()
    const overdueFinances = allFinances.filter((finance) => {
      if (finance.statusName !== 'PENDING') return false
      
      const dataIn = finance.dataIn as { paymentDate?: string } | null
      if (!dataIn?.paymentDate) return false
      
      const paymentDate = new Date(dataIn.paymentDate)
      return paymentDate < today
    })

    const overdueCount = overdueFinances.length

    // 5. Общий портфель инвесторов (сумма productPrice из deals со статусом APPROVED)
    const approvedDeals = allDeals.filter((deal) => deal.statusName === 'APPROVED')
    let investorPortfolio = 0
    for (const deal of approvedDeals) {
      const productPrice = deal.dataIn?.productPrice
      if (productPrice) {
        const price = typeof productPrice === 'string' 
          ? Number(productPrice.replace(/[^\d.-]/g, '')) 
          : Number(productPrice)
        if (Number.isFinite(price)) {
          investorPortfolio += price
        }
      }
    }

    // 6. Заявки по менеджерам
    // First, get all managers with admin/Administrator role
    const MeRepository = (await import('@/shared/repositories/me.repository')).MeRepository
    const meRepository = MeRepository.getInstance()
    const allUsers = await usersRepo.findAll()
    
    const managers: Array<{ uuid: string; name: string }> = []
    
    for (const user of allUsers) {
      // Skip soft-deleted users
      if (user.deletedAt) continue
      
      try {
        const userWithRoles = await meRepository.findByIdWithRoles(Number(user.id), {
          includeHuman: true,
        })
        
        if (!userWithRoles) continue
        
        // Check if user has admin or Administrator role
        const hasAdminRole = userWithRoles.roles.some(
          (role) =>
            role.name === 'Administrator' ||
            role.name === 'admin' ||
            role.isSystem === true
        )
        
        if (hasAdminRole) {
          // Get manager name from human data
          const humanData = userWithRoles.human?.dataIn as { 
            firstName?: string
            lastName?: string
            middleName?: string
          } | null
          
          let managerName = 'Не указан'
          if (humanData) {
            const parts = [
              humanData.lastName,
              humanData.firstName,
              humanData.middleName,
            ].filter(Boolean) as string[]
            if (parts.length > 0) {
              managerName = parts.join(' ')
            }
          } else if (userWithRoles.human?.fullName) {
            managerName = userWithRoles.human.fullName
          }
          
          // If no name found, use email as fallback
          if (managerName === 'Не указан' && user.email) {
            managerName = user.email
          }
          
          managers.push({
            uuid: user.uuid,
            name: managerName,
          })
        }
      } catch (err) {
        console.error(`Failed to load roles for user ${user.uuid}:`, err)
        // Continue with next user
      }
    }
    
    // Count deals for each manager
    const dealsByManager = new Map<string, number>()
    
    // Initialize all managers with 0 count
    for (const manager of managers) {
      dealsByManager.set(manager.uuid, 0)
    }
    
    // Count deals for managers
    for (const deal of allDeals) {
      const managerUuid = deal.dataIn?.managerUuid
      if (managerUuid && dealsByManager.has(managerUuid)) {
        const count = dealsByManager.get(managerUuid) || 0
        dealsByManager.set(managerUuid, count + 1)
      }
    }
    
    // Build applicationsByManager array with all managers (even with 0 deals)
    const applicationsByManager: Array<{ manager: string; count: number }> = []
    
    for (const manager of managers) {
      const count = dealsByManager.get(manager.uuid) || 0
      applicationsByManager.push({
        manager: manager.name,
        count,
      })
    }
    
    // Sort by count descending, then by name
    applicationsByManager.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count
      }
      return a.manager.localeCompare(b.manager)
    })

    const metrics: DashboardMetrics = {
      newApplicationsToday,
      newApplicationsPeriod,
      scoringAmount,
      overdueCount,
      investorPortfolio,
      applicationsByManager,
    }

    return NextResponse.json(metrics, { status: 200 })
  } catch (error) {
    console.error('Dashboard error:', error)
    const message = error instanceof Error ? error.message : 'Не удалось загрузить данные дашборда'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> }
) {
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handleGet(ctx, request)
  })(request, context)
}

