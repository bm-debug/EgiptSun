'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart'

type DashboardMetrics = {
  applicationsThisMonth: number
  approvedApplications: number
  totalPayouts: number
  applicationsByDay: Array<{ date: string; count: number }>
  recentApplications: Array<{
    id: string
    clientName: string
    amount: number
    date: string
    status: string
  }>
}

const initialMetrics: DashboardMetrics = {
  applicationsThisMonth: 0,
  approvedApplications: 0,
  totalPayouts: 0,
  applicationsByDay: [],
  recentApplications: [],
}

export default function PartnerDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [metrics, setMetrics] = React.useState<DashboardMetrics>(initialMetrics)

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/altrp/v1/p/dashboard', {
          credentials: 'include',
        })

        if (response.status === 401 || response.status === 403) {
          throw new Error('Недостаточно прав для просмотра дашборда партнера')
        }

        if (!response.ok) {
          throw new Error('Не удалось загрузить данные дашборда')
        }

        const data = await response.json() as {
          success?: boolean
          data?: DashboardMetrics
          message?: string
        }

        if (!data.success || !data.data) {
          throw new Error(data.message || 'Ответ сервера не содержит данных')
        }

        const normalizedByDay = (data.data.applicationsByDay || []).map((item) => ({
          date: item.date,
          count: Number(item.count) || 0,
          label: new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        }))

        setMetrics({
          applicationsThisMonth: data.data.applicationsThisMonth ?? 0,
          approvedApplications: data.data.approvedApplications ?? 0,
          totalPayouts: data.data.totalPayouts ?? 0,
          applicationsByDay: normalizedByDay,
          recentApplications: data.data.recentApplications ?? [],
        })
      } catch (err) {
        console.error('Dashboard fetch error:', err)
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const hasApplications =
    metrics.applicationsByDay.some((item) => item.count > 0) ||
    metrics.recentApplications.length > 0

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
        <h1 className="text-3xl font-bold">Дашборд</h1>
        <Button onClick={() => router.push('/p/deals?create=1')}>
          Создать заявку
        </Button>
      </div>

      {!hasApplications && (
        <Card className="border-dashed bg-muted/40">
          <CardHeader>
            <CardTitle>Добро пожаловать!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Здесь будет сводка по заявкам и выплатам вашего магазина.
              Начните с оформления первой заявки для клиента.
            </p>
            <Button onClick={() => router.push('/p/deals?create=1')}>
              Создать первую заявку
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Заявок за месяц
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.applicationsThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Одобрено заявок
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.approvedApplications}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Сумма выплат
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(metrics.totalPayouts)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Заявки по дням</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.applicationsByDay.length > 0 ? (
            <ChartContainer
              config={{
                applications: {
                  label: 'Заявки',
                  color: 'var(--chart-2)',
                },
              } satisfies ChartConfig}
              className="h-[300px] w-full">
              <BarChart
                data={metrics.applicationsByDay.map((item) => ({
                  ...item,
                  label: new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
                }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `${value} заявок`}
                    />
                  }
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-applications)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Нет данных
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Последние заявки</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.recentApplications.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Нет заявок
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.id}</TableCell>
                    <TableCell>{app.clientName}</TableCell>
                    <TableCell>{formatCurrency(app.amount)}</TableCell>
                    <TableCell>{formatDate(app.date)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          app.status === 'Одобрена'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : app.status === 'На рассмотрении'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                        {app.status}
                      </span>
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

