'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart'
import { useIsMobile } from '@/packages/hooks/use-mobile'
import { DateTimePicker } from '@/components/ui/date-time-picker'

export default function InvestorDashboardPage() {
  const isMobile = useIsMobile()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [dateRange, setDateRange] = React.useState<{ start: Date | null; end: Date | null }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  })
  const [metrics, setMetrics] = React.useState({
    totalCapital: 0,
    periodReturn: 0,
    totalProfit: 0,
    activeInvestmentsCount: 0,
    portfolioData: [] as Array<{ date: string; value: number }>,
    investmentStructure: [] as Array<{ name: string; value: number }>,
    recentOperations: [] as Array<{
      id: string
      type: string
      description: string
      date: string
    }>,
  })

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        const startDate = dateRange.start || new Date(new Date().setDate(new Date().getDate() - 30))
        const endDate = dateRange.end || new Date()
        
        // Ensure start date is before end date
        const actualStartDate = startDate < endDate ? startDate : endDate
        const actualEndDate = startDate < endDate ? endDate : startDate

        // Fetch journals (operations) for the selected period
        const journalsParams = new URLSearchParams({
          page: '1',
          limit: '10',
          orderBy: 'createdAt',
          orderDirection: 'desc',
        })

        // Add date filters if needed (journals API will filter by investor automatically)
        const journalsResponse = await fetch(`/api/altrp/v1/i/journals?${journalsParams.toString()}`, {
          credentials: 'include',
        })

        if (!journalsResponse.ok) {
          throw new Error('Failed to fetch journals')
        }

        const journalsData = await journalsResponse.json() as {
          success: boolean
          data?: {
            docs?: any[]
          }
        }
        const journals: any[] = journalsData.success && journalsData.data && journalsData.data.docs 
          ? journalsData.data.docs 
          : []

        // Transform journals to operations format (matching admin dashboard format)
        const recentOperations = journals
          .filter((journal: any) => {
            if (!journal.createdAt) return false
            const journalDate = new Date(journal.createdAt)
            return journalDate >= actualStartDate && journalDate <= actualEndDate
          })
          .slice(0, 10)
          .map((journal: any) => {
            const details = typeof journal.details === 'string' 
              ? JSON.parse(journal.details) 
              : journal.details || {}
            
            const actionType = journal.action || 'Событие'

            // Map action types to readable names (for actions that weren't already transformed by parseJournals)
            const actionNames: Record<string, string> = {
              LOAN_APPLICATION_SNAPSHOT: 'Заявка на рассрочку',
              DEAL_STATUS_CHANGE: 'Изменение статуса заявки',
              DEAL_APPROVED: 'Одобрение заявки',
              DEAL_REJECTED: 'Отклонение заявки',
              DEAL_CANCELLED: 'Отмена заявки',
              INVESTOR_REGISTERED: 'Новый инвестор',
              PAYMENT_RECEIVED: 'Получен платеж',
              // User journal actions are already transformed by parseJournals
              'Вход в систему': 'Вход в систему',
              'Выход из системы': 'Выход из системы',
              'Регистрация': 'Регистрация',
              'Пополнение кошелька': 'Пополнение кошелька',
              'Гашение платежа': 'Гашение платежа',
            }

            const type = actionNames[journal.action] || journal.action || actionType

            // Use description from details if available (enriched by parseJournals)
            let description: string
            if (details && 'description' in details && typeof details.description === 'string') {
              description = details.description
            } else {
              // Fallback: use action type or message
              const detailsObj = details as { message?: string; context?: string } | undefined
              const message = detailsObj?.message || detailsObj?.context || actionType
              description = message || `${actionType} #${journal.uuid?.substring(0, 8) || journal.id}`
            }

            return {
              id: journal.uuid || `journal-${journal.id}`,
              type,
              description,
              date: journal.createdAt || new Date().toISOString(),
            }
          })

        // Extract amounts from journal details for calculations
        const operationsWithAmounts = journals
          .filter((journal: any) => {
            if (!journal.createdAt) return false
            const journalDate = new Date(journal.createdAt)
            return journalDate >= actualStartDate && journalDate <= actualEndDate
          })
          .map((journal: any) => {
            const details = typeof journal.details === 'string' 
              ? JSON.parse(journal.details) 
              : journal.details || {}
            
            // Extract amount from details if available
            let amount = 0
            if (details.transaction?.amountRubles) {
              amount = details.transaction.amountRubles
            } else if (details.transaction?.amountKopecks) {
              amount = details.transaction.amountKopecks / 100
            } else if (details.amount) {
              amount = typeof details.amount === 'number' ? details.amount : parseFloat(details.amount) || 0
            }

            const action = journal.action || ''
            return {
              action,
              amount: Math.abs(amount),
              date: journal.createdAt || new Date().toISOString(),
              type: action.includes('WALLET_DEPOSIT') || action.includes('Пополнение') ? 'deposit' :
                    action.includes('PROFIT') || action.includes('Прибыль') ? 'profit' :
                    action.includes('WITHDRAW') || action.includes('Вывод') ? 'withdraw' : 'other'
            }
          })

        // Generate portfolio data for the selected period (simplified - will be enhanced later)
        const daysDiff = Math.ceil((actualEndDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24))
        const dataPoints = Math.min(Math.max(Math.floor(daysDiff / 7), 2), 52) // Weekly points, max 52 weeks
        
        // Calculate portfolio value based on operations (simplified)
        let runningBalance = 0
        const portfolioData = Array.from({ length: dataPoints }, (_, i) => {
          const date = new Date(actualStartDate)
          const step = daysDiff / dataPoints
          date.setDate(date.getDate() + Math.floor(i * step))
          
          // Add operations that occurred before this date
          const operationsBeforeDate = operationsWithAmounts.filter((op: any) => {
            const opDate = new Date(op.date)
            return opDate <= date
          })
          
          const balanceChange = operationsBeforeDate.reduce((sum: number, op: any) => {
            if (op.type === 'deposit' || op.type === 'profit') {
              return sum + op.amount
            } else if (op.type === 'withdraw') {
              return sum - op.amount
            }
            return sum
          }, 0)
          
          runningBalance = Math.max(0, runningBalance + balanceChange)
          
          return {
            date: date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }),
            value: runningBalance || 0,
          }
        })

        // Calculate metrics from operations
        const totalDeposits = operationsWithAmounts
          .filter((op: any) => op.type === 'deposit')
          .reduce((sum: number, op: any) => sum + op.amount, 0)
        
        const totalProfit = operationsWithAmounts
          .filter((op: any) => op.type === 'profit')
          .reduce((sum: number, op: any) => sum + op.amount, 0)

        const totalWithdrawals = operationsWithAmounts
          .filter((op: any) => op.type === 'withdraw')
          .reduce((sum: number, op: any) => sum + op.amount, 0)

        // Calculate total capital: deposits + profit - withdrawals
        const calculatedCapital = totalDeposits + totalProfit - totalWithdrawals
        const totalCapital = portfolioData.length > 0 && portfolioData[portfolioData.length - 1].value > 0
          ? portfolioData[portfolioData.length - 1].value 
          : calculatedCapital

        const periodReturn = totalCapital > 0 && totalDeposits > 0
          ? ((totalCapital - totalDeposits) / totalDeposits) * 100
          : 0

        // Count active investments (operations that are investments, not withdrawals)
        const activeInvestmentsCount = operationsWithAmounts.filter((op: any) => 
          op.type !== 'withdraw' && op.amount > 0
        ).length

        setMetrics({
          totalCapital: totalCapital || 0,
          periodReturn: Math.round(periodReturn * 10) / 10,
          totalProfit: totalProfit || 0,
          activeInvestmentsCount: activeInvestmentsCount || 0,
          portfolioData: portfolioData.length > 0 ? portfolioData : [{ date: new Date().toLocaleDateString('ru-RU'), value: 0 }],
          investmentStructure: [
            { name: 'Консервативный', value: Math.round(totalCapital * 0.4) },
            { name: 'Сбалансированный', value: Math.round(totalCapital * 0.33) },
            { name: 'Агрессивный', value: Math.round(totalCapital * 0.27) },
          ],
          recentOperations,
        })
        setLoading(false)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [dateRange.start, dateRange.end])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return ''
    
    // Time from DB is in UTC format like "2025-11-27 14:07:31.194" (without timezone indicator)
    // We need to explicitly treat it as UTC, otherwise JavaScript parses it as local time
    let utcDateString = dateString.trim()
    
    // Convert PostgreSQL timestamp format to ISO format with UTC indicator
    // "2025-11-27 14:07:31.194" -> "2025-11-27T14:07:31.194Z"
    if (utcDateString.includes(' ') && !utcDateString.includes('T')) {
      // Replace space with 'T' and add 'Z' to mark as UTC
      utcDateString = utcDateString.replace(' ', 'T') + 'Z'
    } else if (utcDateString.includes('T') && !utcDateString.includes('Z') && !utcDateString.match(/[+-]\d{2}:?\d{2}$/)) {
      // ISO format without timezone - add 'Z' to mark as UTC
      utcDateString = utcDateString + 'Z'
    }
    // If it already has 'Z' or timezone offset, use as is
    
    // Parse as UTC - JavaScript will automatically convert to browser's local timezone
    const parsedDate = new Date(utcDateString)
    
    // Check if date is valid
    if (isNaN(parsedDate.getTime())) {
      return 'неизвестно'
    }
    
    // Get current time (in local timezone)
    const now = new Date()
    
    // Calculate difference in milliseconds
    // Both getTime() return milliseconds since epoch (UTC), so difference accounts for timezone
    const diffMs = now.getTime() - parsedDate.getTime()
    
    // Handle negative differences (future dates)
    if (diffMs < 0) {
      return 'только что'
    }
    
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) {
      return 'только что'
    } else if (diffMins < 60) {
      return `${diffMins} мин. назад`
    } else if (diffHours < 24) {
      return `${diffHours} ч. назад`
    } else {
      return `${diffDays} дн. назад`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold">Портфель</h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          <DateTimePicker
            mode="date"
            value={dateRange.start}
            onChange={(date) => setDateRange((prev) => ({ ...prev, start: date }))}
            placeholder="Начало периода"
            className="w-[160px] md:w-[180px]"
          />
          <span className="text-muted-foreground">—</span>
          <DateTimePicker
            mode="date"
            value={dateRange.end}
            onChange={(date) => setDateRange((prev) => ({ ...prev, end: date }))}
            placeholder="Конец периода"
            className="w-[160px] md:w-[180px]"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Общий капитал
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(metrics.totalCapital)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Доходность за период
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.periodReturn}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Активных инвестиций
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.activeInvestmentsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Общая прибыль
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(metrics.totalProfit)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Динамика портфеля</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {metrics.portfolioData.length > 0 ? (
              <div className="min-w-0 w-full">
                <ChartContainer
                  config={{
                    portfolio: {
                      label: 'Стоимость',
                      color: 'var(--chart-2)',
                    },
                  } satisfies ChartConfig}
                  className="h-[250px] md:h-[300px] w-full min-w-[300px]">
                  <AreaChart data={metrics.portfolioData}>
                    <defs>
                      <linearGradient id="fillPortfolio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-portfolio)" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="var(--color-portfolio)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      className="text-xs"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      width={50}
                      className="text-xs"
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-portfolio)"
                      fill="url(#fillPortfolio)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-[250px] md:h-[300px] flex items-center justify-center text-muted-foreground">
                Нет данных
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Средняя доходность
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">11.2%</div>
                <p className="text-xs text-muted-foreground mt-1">годовых</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Риск портфеля
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Средний</div>
                <p className="text-xs text-muted-foreground mt-1">балансированный</p>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Структура вложений</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {metrics.investmentStructure.length > 0 ? (
                <div className="min-w-0 w-full">
                  <ChartContainer
                    config={{
                      Консервативный: {
                        label: 'Консервативный',
                        color: 'var(--chart-1)',
                      },
                      Сбалансированный: {
                        label: 'Сбалансированный',
                        color: 'var(--chart-2)',
                      },
                      Агрессивный: {
                        label: 'Агрессивный',
                        color: 'var(--chart-3)',
                      },
                    } satisfies ChartConfig}
                    className="h-[200px] md:h-[220px] w-full min-w-[280px]">
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatCurrency(Number(value))}
                          />
                        }
                      />
                      <Pie
                        data={metrics.investmentStructure}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 60 : 80}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}>
                        {metrics.investmentStructure.map((entry) => {
                          return (
                            <Cell
                              key={`cell-${entry.name}`}
                              fill={`var(--color-${entry.name})`}
                            />
                          )
                        })}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </div>
              ) : (
                <div className="h-[200px] md:h-[220px] flex items-center justify-center text-muted-foreground">
                  Нет данных
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние операции</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.recentOperations.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Нет операций
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Время</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentOperations.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell className="font-medium">{op.type}</TableCell>
                    <TableCell>{op.description}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTimeAgo(op.date)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

