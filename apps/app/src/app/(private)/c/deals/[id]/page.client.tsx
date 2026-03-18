'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, Clock, XCircle } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

interface DealDetail {
  deal: {
    id: string
    uuid: string
    title: string
    status: string
    statusName?: string
    createdAt: string
    dataIn?: any
    dataOut?: any
    products?: any[]
  }
}

interface Finance {
  uuid: string
  statusName: string
  paymentDate: string | null
  sum: number
  paidAt: string | null
  paymentNumber: number | null
  order: number
}

export default function DealDetailPageClient() {
  const params = useParams()
  const dealId = params.id as string
  const [dealData, setDealData] = React.useState<DealDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [finances, setFinances] = React.useState<Finance[]>([])
  const [loadingFinances, setLoadingFinances] = React.useState(false)
  const [financesError, setFinancesError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchDeal = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/altrp/v1/c/deals/${dealId}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({ error: 'Failed to load deal' }))) as { error?: string }
          throw new Error(errorData.error || 'Сделка не найдена')
        }

        const data = (await response.json()) as DealDetail
        setDealData(data)
        setLoading(false)
      } catch (err) {
        console.error('Deal fetch error:', err)
        setError(err instanceof Error ? err.message : 'Сделка не найдена')
        setLoading(false)
      }
    }

    if (dealId) {
      fetchDeal()
    }
  }, [dealId])

  // Fetch finances for this deal
  React.useEffect(() => {
    const fetchFinances = async () => {
      if (!dealId) return

      try {
        setLoadingFinances(true)
        setFinancesError(null)

        const response = await fetch(`/api/altrp/v1/c/deals/${dealId}/finances`, {
          credentials: 'include',
        })

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({ error: 'Failed to load finances' }))) as { error?: string }
          throw new Error(errorData.error || 'Не удалось загрузить платежи')
        }

        const data = (await response.json()) as { success: boolean; finances: Finance[]; total: number }
        setFinances(data.finances || [])
        setLoadingFinances(false)
      } catch (err) {
        console.error('Finances fetch error:', err)
        setFinancesError(err instanceof Error ? err.message : 'Не удалось загрузить платежи')
        setLoadingFinances(false)
      }
    }

    if (dealId) {
      fetchFinances()
    }
  }, [dealId])

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
      month: 'long',
      year: 'numeric',
    }).format(date)
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const getFinanceStatusBadge = (statusName: string) => {
    switch (statusName) {
      case 'PAID':
        return <Badge variant="default" className="bg-green-600">Оплачен</Badge>
      case 'PENDING':
        return <Badge variant="secondary">Ожидается</Badge>
      case 'OVERDUE':
        return <Badge variant="destructive">Просрочен</Badge>
      default:
        return <Badge variant="outline">{statusName}</Badge>
    }
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'Оплачен':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'Ожидается':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'Просрочен':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  // Calculate payment schedule - only if deal is approved or schedule already exists
  const paymentSchedule = React.useMemo(() => {
    if (!dealData?.deal?.dataIn) return []
    
    // Check if deal is approved (APPROVED status means payment schedule should exist)
    const isApproved = dealData.deal.status === 'APPROVED' || 
                      dealData.deal.status === 'approved' || 
                      dealData.deal.status === 'Активна'
    
    // If payment schedule exists in dataIn, use it
    if (dealData.deal.dataIn.paymentSchedule && Array.isArray(dealData.deal.dataIn.paymentSchedule)) {
      return dealData.deal.dataIn.paymentSchedule
    }
    
    // Only calculate schedule if deal is approved (but schedule not yet created)
    // For non-approved deals, don't show payment schedule
    if (!isApproved) {
      return []
    }
    
    // Otherwise, calculate it from deal data (only for approved deals)
    const productPrice = parseFloat(dealData.deal.dataIn.productPrice || dealData.deal.dataIn.purchasePrice || '0')
    const downPayment = parseFloat(dealData.deal.dataIn.downPayment || '0')
    const installmentTerm = dealData.deal.dataIn.term?.[0] || parseFloat(dealData.deal.dataIn.installmentTerm || '0')
    const monthlyPayment = parseFloat(dealData.deal.dataIn.monthlyPayment || '0')
    
    if (productPrice <= 0 || installmentTerm <= 0) return []
    
    // Calculate remaining amount after down payment
    const remainingAmount = productPrice - downPayment
    const calculatedMonthlyPayment = monthlyPayment > 0 ? monthlyPayment : remainingAmount / installmentTerm
    
    // Start date: 30 days from deal creation or today
    const startDate = new Date(dealData.deal.createdAt || new Date())
    startDate.setDate(startDate.getDate() + 30)
    
    const schedule: Array<{ date: string; amount: number; status: string; number: number }> = []
    
    for (let i = 0; i < installmentTerm; i++) {
      const paymentDate = new Date(startDate)
      paymentDate.setMonth(paymentDate.getMonth() + i)
      
      // Last payment might be slightly different to account for rounding
      const isLastPayment = i === installmentTerm - 1
      const amount = isLastPayment 
        ? remainingAmount - (calculatedMonthlyPayment * (installmentTerm - 1))
        : calculatedMonthlyPayment
      
      schedule.push({
        date: paymentDate.toISOString().split('T')[0],
        amount: Math.round(amount * 100) / 100,
        status: 'Ожидается',
        number: i + 1,
      })
    }
    
    return schedule
  }, [dealData])

  // Prepare chart data from payment schedule
  const chartData = React.useMemo(() => {
    if (!paymentSchedule || paymentSchedule.length === 0) return []
    
    return paymentSchedule.map((payment: any, index: number) => ({
      month: `Месяц ${index + 1}`,
      amount: payment.amount || 0,
      date: payment.date || '',
      number: index + 1,
    }))
  }, [paymentSchedule])

  const chartConfig = {
    amount: {
      label: 'Сумма',
      color: 'var(--chart-2)',
    },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !dealData) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 m-6">
        <p className="text-sm text-destructive">{error || 'Deal not found'}</p>
      </div>
    )
  }

  const deal = dealData.deal

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Сделка {deal.id}</h1>
        <div className="flex items-center gap-3">
          <Badge variant={deal.status === 'Активна' ? 'default' : 'secondary'}>
            {deal.status}
          </Badge>
          {deal.statusName === 'SCORING' && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/c/deals/${dealId}/edit`}>Редактировать</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Детали сделки</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Товар</TableCell>
                  <TableCell>{deal.title || '—'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Цена</TableCell>
                  <TableCell>
                    {deal.dataIn?.purchasePrice
                      ? formatCurrency(deal.dataIn.purchasePrice)
                      : '—'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Первый взнос</TableCell>
                  <TableCell>
                    {deal.dataIn?.downPayment
                      ? formatCurrency(deal.dataIn.downPayment)
                      : '—'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Срок рассрочки</TableCell>
                  <TableCell>
                    {deal.dataIn?.installmentTerm
                      ? `${deal.dataIn.installmentTerm} мес.`
                      : '—'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Ежемесячный платеж</TableCell>
                  <TableCell>
                    {deal.dataIn?.monthlyPayment
                      ? formatCurrency(deal.dataIn.monthlyPayment)
                      : '—'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Дата создания</TableCell>
                  <TableCell>{formatDate(deal.createdAt)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Платежи</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingFinances ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : financesError ? (
              <p className="text-sm text-destructive">{financesError}</p>
            ) : finances && finances.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>№</TableHead>
                    <TableHead>Дата платежа</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата оплаты</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finances.map((finance, index) => (
                    <TableRow key={finance.uuid}>
                      <TableCell className="font-medium">
                        {finance.paymentNumber || finance.order || index + 1}
                      </TableCell>
                      <TableCell>
                        {finance.paymentDate ? formatDate(finance.paymentDate) : '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(finance.sum || 0)}
                      </TableCell>
                      <TableCell>
                        {getFinanceStatusBadge(finance.statusName)}
                      </TableCell>
                      <TableCell>
                        {finance.paidAt ? formatDateTime(finance.paidAt) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Платежи не найдены</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

