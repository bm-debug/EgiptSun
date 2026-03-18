'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
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
import { Search, Loader2 } from 'lucide-react'
import { AdminHeader } from '@/packages/components/blocks-app/app-admin/AdminHeader'
import Link from 'next/link'
import qs from 'qs'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import debounce from 'lodash/debounce'
import { cn } from '@/lib/utils'
import { useNotice } from '@/packages/components/blocks-app/app-admin/AdminNoticesProvider'
import type { 
  LoanApplication,
} from '@/shared/types/altrp'
import type { 
  DbPaginatedResult,
  DbPaginationResult,
} from '@/shared/types/shared'
import { formatDate } from '@/shared/utils/date-format'

const INITIAL_LIMIT = 10
const LOAN_STATUSES = ['NEW', 'SCORING', 'ADDITIONAL_INFO_REQUESTED'] // Only show these statuses

export default function AdminLoansPage() {
  const router = useRouter()
  const [loans, setLoans] = React.useState<LoanApplication[]>([])
  const [pagination, setPagination] = React.useState<DbPaginationResult>({
    total: 0,
    page: 1,
    limit: INITIAL_LIMIT,
    totalPages: 1,
  })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  
  // Initialize search from URL params
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const search = urlParams.get('search')
  const [searchQuery, setSearchQuery] = React.useState(search || '')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('')
  
  const [currentPage, setCurrentPage] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return parseInt(params.get('page') || '1', 10)
    }
    return 1
  })
  
  // Initialize date filters from URL params (null if not present)
  const [dateRange, setDateRange] = React.useState<{ start: Date | null; end: Date | null }>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const startDateParam = params.get('startDate')
      const endDateParam = params.get('endDate')
      return {
        start: startDateParam ? new Date(startDateParam) : null,
        end: endDateParam ? new Date(endDateParam) : null,
      }
    }
    return { start: null, end: null }
  })

  // Initialize search from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const search = urlParams.get('search')
      if (search) {
        setSearchQuery(search)
      }
    }
  }, [])

  // Debounce search query and update URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery || '')
      setCurrentPage(1) // Reset to first page when search changes
      
      const params = qs.parse(window.location.search.replace('?', '').split('#')[0])
      if (params.search === searchQuery) {
        return
      }
      if (searchQuery) {
        params.search = searchQuery
      } else {
        delete params.search
      }
      const newUrl = `/m/loans?${qs.stringify(params)}`
      window.history.replaceState({}, '', newUrl)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Update URL when filters change
  React.useEffect(() => {
    const params = new URLSearchParams()
    if (currentPage > 1) {
      params.set('page', currentPage.toString())
    }
    if (debouncedSearchQuery) {
      params.set('search', debouncedSearchQuery)
    }
    if (dateRange.start) {
      params.set('startDate', dateRange.start.toISOString().split('T')[0])
    }
    if (dateRange.end) {
      params.set('endDate', dateRange.end.toISOString().split('T')[0])
    }

    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
    window.history.replaceState({}, '', newUrl)
  }, [currentPage, debouncedSearchQuery, dateRange])

  // Base fetch function - always filter by NEW and SCORING statuses
  const fetchLoansBase = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pagination.limit.toString(),
      })

      const filtersConditions: Array<{
        field: string
        operator: string
        values: string[]
      }> = []

      // Always filter by NEW and SCORING statuses
      filtersConditions.push({
        field: 'statusName',
        operator: 'in',
        values: LOAN_STATUSES,
      })

      // Add date filters if provided
      if (dateRange.start) {
        // Format as YYYY-MM-DD 00:00:00 for PostgreSQL text timestamp comparison
        const startDateStr = dateRange.start.toISOString().split('T')[0] + ' 00:00:00'
        filtersConditions.push({
          field: 'createdAt',
          operator: 'gte',
          values: [startDateStr],
        })
      }

      if (dateRange.end) {
        // Set end date to end of day and format as YYYY-MM-DD 23:59:59
        const endDate = new Date(dateRange.end)
        endDate.setHours(23, 59, 59, 999)
        const endDateStr = endDate.toISOString().split('T')[0] + ' 23:59:59'
        filtersConditions.push({
          field: 'createdAt',
          operator: 'lte',
          values: [endDateStr],
        })
      }

      if (filtersConditions.length > 0) {
        params.append('filters', JSON.stringify({ conditions: filtersConditions }))
      }

      // Add search parameter if exists
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery)
      }

      const response = await fetch(`/api/altrp/v1/admin/loan-application?${params.toString()}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Не удалось загрузить заявки')
      }

      const data = (await response.json()) as DbPaginatedResult<LoanApplication>
      setLoans(data.docs)
      setPagination(data.pagination)
      setError(null)
    } catch (err) {
      console.error('Loans fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load loans')
      setLoans([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, pagination.limit, debouncedSearchQuery, dateRange])

  // Debounced version of fetchLoans
  const fetchLoans = useMemo(
    () => debounce(fetchLoansBase, 600),
    [fetchLoansBase]
  )

  useEffect(() => {
    fetchLoans()

    // Cleanup debounced function on unmount
    return () => {
      fetchLoans.cancel()
    }
  }, [fetchLoans])

  // Subscribe to new loans count changes and refresh table
  const newLoansCount = useNotice('new_loans_count')
  const prevCountRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    // Skip initial render
    if (prevCountRef.current === undefined) {
      prevCountRef.current = newLoansCount
      return
    }

    // Only refresh if count actually changed
    if (prevCountRef.current !== newLoansCount) {
      prevCountRef.current = newLoansCount
      // Use non-debounced version for immediate update
      fetchLoansBase()
    }
  }, [newLoansCount, fetchLoansBase])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusVariant = (status?: string | null) => {
    switch (status) {
      case 'NEW':
      case 'SCORING':
        return 'secondary'
      case 'ADDITIONAL_INFO_REQUESTED':
        return 'default'
      default:
        return 'outline'
    }
  }

  const getStatusLabel = (status?: string | null) => {
    switch (status) {
      case 'NEW':
        return 'Новая заявка'
      case 'SCORING':
        return 'Скоринг'
      case 'ADDITIONAL_INFO_REQUESTED':
        return 'Дополнительная информация запрошена'
      default:
        return status ?? 'Неизвестно'
    }
  }

  const breadcrumbs = React.useMemo(
    () => [
      { label: 'Панель администратора', href: '/m/dashboard' },
      { label: 'Заявки на рассрочку', href: '/m/loans' },
    ],
    [],
  )

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < pagination.totalPages) {
      setCurrentPage((prev) => prev + 1)
    }
  }

  // if (loading) {
  //   return (
  //     <>
  //       <AdminHeader title="Заявки на рассрочку" breadcrumbItems={breadcrumbs} />
  //       <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
  //         <div className="flex items-center justify-center py-12">
  //           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  //         </div>
  //       </main>
  //     </>
  //   )
  // }

  if (error) {
    return (
      <>
        <AdminHeader title="Заявки на рассрочку" breadcrumbItems={breadcrumbs} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Заявки на рассрочку" breadcrumbItems={breadcrumbs} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Заявки на рассрочку</h1>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по ФИО или ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DateTimePicker
              mode="date"
              value={dateRange.start}
              onChange={(date) => {
                setDateRange((prev) => ({ ...prev, start: date }))
                setCurrentPage(1)
              }}
              placeholder="Начало периода"
              className="w-[180px]"
              toDate={new Date()}
            />
            <DateTimePicker
              mode="date"
              value={dateRange.end}
              onChange={(date) => {
                setDateRange((prev) => ({ ...prev, end: date }))
                setCurrentPage(1)
              }}
              placeholder="Конец периода"
              className="w-[180px]"
              toDate={new Date()}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Заявки</CardTitle>
          </CardHeader>
          <CardContent>
            {loans.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Нет заявок
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">ID</TableHead>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата создания</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => {
                    const viewedAt = (loan.dataIn as any)?.viewed_at
                    const isUnread = !viewedAt
                    return (
                      <TableRow
                        key={loan.daid} 
                        className={cn('cursor-pointer', isUnread && 'font-semibold bg-[var(--primary-light)]')}
                        onClick={() => router.push(`/m/deals/view?uuid=${loan.uuid}`)}>
                        <TableCell className={cn('font-medium', isUnread && 'font-semibold')}>
                          <Link href={`/m/deals/view?uuid=${loan.uuid}`}>{loan.daid}</Link>
                        </TableCell>
                        <TableCell>{`${loan.dataIn.firstName} ${loan.dataIn.lastName}`.trim()}</TableCell>
                        <TableCell>{formatCurrency(Number(loan.dataIn.productPrice))}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(loan.statusName)}>
                            {getStatusLabel(loan.statusName)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(loan.createdAt)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <div>
                Показано {loans.length} из {pagination.total} заявок
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage <= 1}>
                  Предыдущая
                </Button>
                <span>
                  Страница {pagination.page} из {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= pagination.totalPages}>
                  Следующая
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </main>
    </>
  )
}
