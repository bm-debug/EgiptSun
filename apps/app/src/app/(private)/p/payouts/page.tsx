'use client'

import * as React from 'react'
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
import { Loader2 } from 'lucide-react'

interface Payout {
  id: string
  amount: number
  date: string
  status: string
  description?: string
}

export default function PartnerPayoutsPage() {
  const [payouts, setPayouts] = React.useState<Payout[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchPayouts = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/altrp/v1/p/payouts', {
          credentials: 'include',
        })

        if (response.status === 401 || response.status === 403) {
          throw new Error('Недостаточно прав для просмотра выплат')
        }

        if (!response.ok) {
          throw new Error('Не удалось загрузить выплаты')
        }

        const data = await response.json() as { success?: boolean; data?: { payouts?: Payout[] }; message?: string }

        if (!data.success || !data.data?.payouts) {
          throw new Error(data.message || 'Ответ сервера не содержит данных')
        }

        setPayouts(data.data.payouts)
      } catch (err) {
        console.error('Payouts fetch error:', err)
        setError(err instanceof Error ? err.message : 'Не удалось загрузить выплаты')
        setPayouts([])
      } finally {
        setLoading(false)
      }
    }

    fetchPayouts()
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
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Выплачено':
        return 'default'
      case 'В обработке':
        return 'secondary'
      case 'Отменено':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Выплаты</h1>

      <Card>
        <CardHeader>
          <CardTitle>История выплат</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : payouts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              Нет выплат
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-medium">{payout.id}</TableCell>
                    <TableCell>{formatCurrency(payout.amount)}</TableCell>
                    <TableCell>{payout.description || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(payout.status)}>
                        {payout.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(payout.date)}
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

