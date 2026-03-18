'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ConsumerHeader } from '@/packages/components/blocks-app/cabinet/ConsumerHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, PlusCircle, Loader2, Edit } from 'lucide-react'
import Link from 'next/link'

interface Deal {
  id: string
  uuid: string
  title: string
  status: string
  statusName?: string
  createdAt: string
  dataIn?: any
}

export default function DealsPageClient() {
  const router = useRouter()
  const [deals, setDeals] = React.useState<Deal[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [statusOptions, setStatusOptions] = React.useState<Array<{ value: string; label: string }>>([])

  const fetchDeals = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      
      const response = await fetch(`/api/altrp/v1/c/deals?${params.toString()}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ error: 'Failed to load deals' }))) as { error?: string }
        throw new Error(errorData.error || 'Failed to load deals')
      }

      const data = (await response.json()) as {
        deals: Array<{
          id: string
          uuid: string
          title: string
          status: string
          statusName?: string
          createdAt: string
          updatedAt: string
          dataIn: { totalAmount?: number; type?: string } | null
        }>
        pagination: {
          total: number
          page: number
          limit: number
          totalPages: number
        }
        statusOptions?: Array<{ value: string; label: string }>
      }

      setDeals(data.deals)
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      })
      setStatusOptions(data.statusOptions || [])
      setLoading(false)
    } catch (err) {
      console.error('Deals fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load deals')
      setLoading(false)
    }
  }, [search, statusFilter, pagination.page, pagination.limit])

  React.useEffect(() => {
    fetchDeals()
  }, [fetchDeals])

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

  const getStatusVariant = (statusName?: string) => {
    if (statusName === 'ACTIVE' || statusName === 'APPROVED') return 'default'
    if (statusName === 'COMPLETED') return 'secondary'
    if (statusName === 'OVERDUE') return 'destructive'
    return 'outline'
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Все Рассрочки</h1>
            <Button asChild>
              <Link href="/c/deals/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Новая заявка
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по ID или названию..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPagination((prev) => ({ ...prev, page: 1 }))
                  }}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Все статусы</option>
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
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
              ) : deals.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">
                  Нет рассрочек
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID сделки</TableHead>
                        <TableHead>Название товара</TableHead>
                        <TableHead>Сумма</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Дата создания</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deals.map((deal) => {
                        const canEdit = deal.statusName && 
                          ['NEW', 'SCORING', 'ADDITIONAL_INFO_REQUESTED'].includes(deal.statusName)
                        return (
                          <TableRow
                            key={deal.uuid}
                            className="cursor-pointer"
                            onClick={() => router.push(`/c/deals/${deal.id}`)}>
                            <TableCell className="font-medium">{deal.id}</TableCell>
                            <TableCell>{deal.title}</TableCell>
                            <TableCell>
                              {deal.dataIn?.totalAmount
                                ? formatCurrency(deal.dataIn.totalAmount)
                                : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(deal.statusName)}>
                                {deal.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(deal.createdAt)}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {canEdit && (
                                <Button variant="ghost" size="icon" asChild>
                                  <Link href={`/c/deals/${deal.id}/edit`}>
                                    <Edit className="h-4 w-4" />
                                  </Link>
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>

                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Страница {pagination.page} из {pagination.totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page === 1}
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}>
                          Назад
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page === pagination.totalPages}
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}>
                          Вперед
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
    </div>
  )
}

