import { withAllowedRoleGuard, withRoleGuard } from '@/shared/api-guard'

const PARTNER_ROLES = ['partner', 'Partner', 'Партнер']

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
} as const

const jsonHeaders = {
  ...corsHeaders,
  'content-type': 'application/json',
} as const

const generateApplicationsByDay = () => {
  const today = new Date()
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today)
    date.setDate(date.getDate() - (13 - index))
    return {
      date: date.toISOString(),
      count: Math.floor(Math.random() * 8) + 1,
    }
  })
}

async function handleGet(): Promise<Response> {
  const applicationsByDay = generateApplicationsByDay()

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        applicationsThisMonth: 45,
        approvedApplications: 32,
        totalPayouts: 2_500_000,
        applicationsByDay: applicationsByDay.map((item) => ({
          date: item.date,
          count: item.count,
        })),
        recentApplications: [
          {
            id: 'APP-001',
            clientName: 'Иванов Иван Иванович',
            amount: 150_000,
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Одобрена',
          },
          {
            id: 'APP-002',
            clientName: 'Петрова Мария Сергеевна',
            amount: 85_000,
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'На рассмотрении',
          },
          {
            id: 'APP-003',
            clientName: 'Сидоров Петр Александрович',
            amount: 200_000,
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Одобрена',
          },
        ],
      },
    }),
    {
      status: 200,
      headers: jsonHeaders,
    },
  )
}

export const GET = withAllowedRoleGuard(handleGet, PARTNER_ROLES)

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}


