'use client'

import * as React from 'react'
import { DashboardStats } from '@/packages/components/blocks-app/cabinet/dashboard/DashboardStats'
import { RecentDeals } from '@/packages/components/blocks-app/cabinet/dashboard/RecentDeals'

export default function ConsumerDashboardPageClient() {
  const [stats, setStats] = React.useState({
    nextPayment: null as { amount: number; date: string } | null,
    totalDebt: 0,
    activeDealsCount: 0,
    recentDeals: [] as any[],
  })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
  }

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // Fetch all deals to calculate stats
        const dealsResponse = await fetch('/api/altrp/v1/c/deals?limit=100&page=1', {
          credentials: 'include',
        })

        if (!dealsResponse.ok) {
          const errorData = (await dealsResponse.json().catch(() => ({ error: 'Failed to load deals' }))) as { error?: string }
          throw new Error(errorData.error || 'Failed to load deals')
        }

        const dealsData = (await dealsResponse.json()) as {
          deals: Array<{
            id: string
            uuid: string
            title: string
            status: string
            statusName?: string
            createdAt: string
            updatedAt: string
            dataIn: {
              totalAmount?: number
              productPrice?: number
              purchasePrice?: number
              paymentSchedule?: Array<{ date: string; amount: number; status?: string }>
              type?: string
            } | null
          }>
          pagination: {
            total: number
            page: number
            limit: number
            totalPages: number
          }
          statusOptions?: Array<{ value: string; label: string }>
        }

        // Calculate stats from deals
        const approvedDeals = dealsData.deals.filter(
          (deal) => deal.statusName === 'APPROVED' || deal.status === 'APPROVED' || deal.status === 'Активна'
        )

        // Find next payment (earliest upcoming unpaid payment)
        // Try to get from dashboard API endpoint first, which has access to finances table
        let nextPayment: { amount: number; date: string } | null = null
        
        try {
          const dashboardResponse = await fetch('/api/altrp/v1/c/dashboard', {
            credentials: 'include',
          })
          
          if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json() as {
              nextPayment?: { amount: number; date: string } | null
              totalDebt?: number
              activeDealsCount?: number
            }
            
            if (dashboardData.nextPayment) {
              nextPayment = dashboardData.nextPayment
            }
          }
        } catch (err) {
          console.error('Failed to fetch dashboard stats:', err)
        }
        
        // Fallback: calculate from paymentSchedule in deals if API didn't return it
        if (!nextPayment) {
          const now = new Date()
          now.setHours(0, 0, 0, 0)

          for (const deal of approvedDeals) {
            const paymentSchedule = deal.dataIn?.paymentSchedule
            if (paymentSchedule && Array.isArray(paymentSchedule)) {
              for (const payment of paymentSchedule) {
                if (payment.status !== 'Оплачен' && payment.date) {
                  const paymentDate = new Date(payment.date)
                  paymentDate.setHours(0, 0, 0, 0)
                  
                  if (paymentDate >= now) {
                    if (!nextPayment || new Date(payment.date) < new Date(nextPayment.date)) {
                      nextPayment = {
                        amount: payment.amount || 0,
                        date: payment.date,
                      }
                    }
                  }
                }
              }
            }
          }
        }

        // Calculate total debt (sum of unpaid payments from approved deals)
        let totalDebt = 0
        for (const deal of approvedDeals) {
          const paymentSchedule = deal.dataIn?.paymentSchedule
          if (paymentSchedule && Array.isArray(paymentSchedule)) {
            for (const payment of paymentSchedule) {
              if (payment.status !== 'Оплачен') {
                totalDebt += payment.amount || 0
              }
            }
          } else {
            // If no payment schedule, use product price as debt
            const price = deal.dataIn?.productPrice || deal.dataIn?.purchasePrice || 0
            totalDebt += price
          }
        }

        // Get recent deals (last 5)
        const recentDeals = dealsData.deals.slice(0, 5)

        setStats({
          nextPayment,
          totalDebt,
          activeDealsCount: approvedDeals.length,
          recentDeals,
        })
        setLoading(false)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return (
    <div className="space-y-6">
      {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Загрузка...</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : (
            <>
              <DashboardStats
                nextPayment={stats.nextPayment}
                totalDebt={stats.totalDebt}
                activeDealsCount={stats.activeDealsCount}
              />
              <RecentDeals 
                deals={stats.recentDeals} 
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                title="Последние заявки"
                caption="Последние 5 заявок на рассрочку"
                emptyMessage="Заявок нет"
                columnHeaders={{
                  id: 'ID заявки',
                  title: 'Название товара',
                  amount: 'Сумма',
                  status: 'Статус',
                  date: 'Дата',
                }}
              />
            </>
          )}
    </div>
  )
}
