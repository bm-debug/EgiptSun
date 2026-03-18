'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useCallback, useEffect, useMemo } from 'react'
import debounce from 'lodash/debounce'
import type { 
  TaxonomyOption, 
  TaxonomyResponse,
  LoanApplication,
  
 } from '@/shared/types/altrp'
 import type { 
    DbPaginatedResult,
    DbPaginationResult,
  } from '@/shared/types/shared'
 

const INITIAL_LIMIT = 10

export default function AdminDealsPage() {
  const router = useRouter()
  const [deals, setDeals] = React.useState<LoanApplication[]>([])
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
  
  // Initialize filters from URL params
  const [statusFilter, setStatusFilter] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('status') || 'all'
    }
    return 'all'
  })
  const [managerFilter, setManagerFilter] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('manager') || 'all'
    }
    return 'all'
  })
  const [currentPage, setCurrentPage] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return parseInt(params.get('page') || '1', 10)
    }
    return 1
  })
  const [statusOptions, setStatusOptions] = React.useState<TaxonomyOption[]>([])
  const [managers, setManagers] = React.useState<Array<{ uuid: string; fullName: string | null; email: string }>>([])
  const [loadingManagers, setLoadingManagers] = React.useState(false)
  
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
      const newUrl = `/m/deals?${qs.stringify(params)}`
      window.history.replaceState({}, '', newUrl)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Update URL when filters change
  React.useEffect(() => {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') {
      params.set('status', statusFilter)
    }
    if (managerFilter !== 'all') {
      params.set('manager', managerFilter)
    }
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
  }, [statusFilter, managerFilter, currentPage, debouncedSearchQuery, dateRange])

  // Base fetch function
  const fetchDealsBase = useCallback(async () => {
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

      // Always exclude NEW, SCORING and ADDITIONAL_INFO_REQUESTED statuses (they are shown on /admin/loans page)
      filtersConditions.push({
        field: 'statusName',
        operator: 'notIn',
        values: ['NEW', 'SCORING', 'ADDITIONAL_INFO_REQUESTED'],
      })

      if (statusFilter !== 'all') {
        filtersConditions.push({
          field: 'statusName',
          operator: 'eq',
          values: [statusFilter],
        })
      }

      if (managerFilter !== 'all') {
        filtersConditions.push({
          field: 'dataIn.managerUuid',
          operator: 'eq',
          values: [managerFilter],
        })
      }

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
      setDeals(data.docs)
      setPagination(data.pagination)
      setError(null)
    } catch (err) {
      console.error('Deals fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load deals')
      setDeals([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, statusFilter, managerFilter, pagination.limit, debouncedSearchQuery, dateRange])

  // Debounced version of fetchDeals
  const fetchDeals = useMemo(
    () => debounce(fetchDealsBase, 600),
    [fetchDealsBase]
  )

  useEffect(() => {
    fetchDeals()

    // Cleanup debounced function on unmount
    return () => {
      fetchDeals.cancel()
    }
  }, [fetchDeals])

  React.useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const filtersPayload = {
          conditions: [
            {
              field: 'entity',
              operator: 'eq',
              values: ['deal.statusName'],
            },
          ],
        }

        const ordersPayload = {
          orders: [{ field: 'sortOrder', direction: 'asc' }],
        }

        const queryParams = qs.stringify({
          limit: 100,
          filters: JSON.stringify(filtersPayload),
          orders: JSON.stringify(ordersPayload),
        }, {
          encode: true,
          arrayFormat: 'brackets',
        })

        const response = await fetch(`/api/admin/taxonomies?${queryParams}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(await response.text())
        }

        const data = (await response.json()) as TaxonomyResponse
        setStatusOptions(data.docs ?? [])
      } catch (err) {
        console.error('Failed to load status taxonomies', err)
      }
    }

    fetchStatuses()
  }, [])

  React.useEffect(() => {
    const fetchManagers = async () => {
      try {
        setLoadingManagers(true)
        const response = await fetch('/api/altrp/v1/admin/users/managers', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch managers')
        }

        const result = await response.json() as { docs?: Array<{ uuid: string; fullName?: string | null; email: string }> }
        const managersList = (result.docs || []).map((manager) => ({
          uuid: manager.uuid,
          fullName: manager.fullName || null,
          email: manager.email,
        }))
        setManagers(managersList)
      } catch (err) {
        console.error('Failed to load managers', err)
        setManagers([])
      } finally {
        setLoadingManagers(false)
      }
    }

    fetchManagers()
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
      month: 'short',
      year: 'numeric',
    }).format(date)
  }

  const getStatusVariant = (status?: string | null) => {
    switch (status) {
      case 'APPROVED':
      case 'ACTIVE':
        return 'default'
      case 'NEW':
      case 'SCORING':
        return 'secondary'
      case 'REJECTED':
      case 'OVERDUE':
        return 'destructive'
      case 'COMPLETED':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getStatusLabel = (status?: string | null) => {
    if (status) {
      const option = statusOptions.find((opt) => opt.name === status)
      if (option) {
        return option.title ?? option.name
      }
    }

    switch (status) {
      case 'NEW':
        return 'Новая заявка'
      case 'SCORING':
        return 'Скоринг'
      case 'INFO_REQUESTED':
        return 'Запрошены данные'
      case 'APPROVED':
        return 'Одобрена'
      case 'REJECTED':
        return 'Отклонена'
      case 'ACTIVE':
        return 'Активна'
      case 'COMPLETED':
        return 'Завершена'
      case 'OVERDUE':
        return 'Просрочена'
      default:
        return status ?? 'Неизвестно'
    }
  }

  const normalizeManager = (name: string | null | undefined) => (name?.trim() ? name.trim() : 'Не назначен')

  const uniqueStatuses = statusOptions
    .filter((option) => option.name)
    .map((option) => ({
      value: option.name,
      label: option.title ?? option.name,
    }))

  const managerOptions = managers.map((manager) => ({
    value: manager.uuid,
    label: manager.fullName || manager.email,
  }))
  const breadcrumbs = React.useMemo(
    () => [
      { label: 'Панель администратора', href: '/m/dashboard' },
      { label: 'Управление заявками', href: '/m/deals' },
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
  if (loading) {
    return (
      <>
        <AdminHeader title="Управление заявками" breadcrumbItems={breadcrumbs} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </>
    )
  }

  if (error) {
    return (
      <>
        <AdminHeader title="Управление заявками" breadcrumbItems={breadcrumbs} />
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
      <AdminHeader title="Управление заявками" breadcrumbItems={breadcrumbs} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Управление заявками</h1>

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
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value)
                setCurrentPage(1) // Reset to first page when filter changes
              }}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {uniqueStatuses
                  .filter((status) => status.value !== 'NEW' && status.value !== 'SCORING')
                  .map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select
              value={managerFilter}
              onValueChange={(value) => {
                setManagerFilter(value)
                setCurrentPage(1) // Reset to first page when filter changes
              }}
              disabled={loadingManagers}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={loadingManagers ? 'Загрузка...' : 'Менеджер'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все менеджеры</SelectItem>
                {managerOptions.map((manager) => (
                  <SelectItem key={manager.value} value={manager.value}>
                    {manager.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            {deals.length === 0 ? (
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
                    <TableHead>Ответственный</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => (
                    <TableRow
                      key={deal.daid} 
                      className="cursor-pointer"
                      onClick={() => router.push(`/m/deals/view?uuid=${deal.uuid}`)}>
                      <TableCell className="font-medium"><Link href={`/m/deals/view?uuid=${deal.uuid}`}>{deal.daid}</Link></TableCell>
                      <TableCell>{`${deal.dataIn.firstName} ${deal.dataIn.lastName}`.trim()}</TableCell>
                      <TableCell>{formatCurrency(Number(deal.dataIn.productPrice))}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(deal.statusName)}>
                          {getStatusLabel(deal.statusName)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const dealWithManager = deal as LoanApplication & { managerName?: string | null }
                          const managerName = dealWithManager.managerName
                          
                          // If managerName is already loaded from API, use it
                          if (managerName) {
                            return managerName
                          }
                          
                          // Otherwise, try to find manager by UUID from dataIn
                          const managerUuid = (deal.dataIn as any)?.managerUuid
                          if (managerUuid && managers.length > 0) {
                            const manager = managers.find(m => m.uuid === managerUuid)
                            if (manager) {
                              return manager.fullName || manager.email
                            }
                          }
                          
                          return normalizeManager(null)
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <div>
                Показано {deals.length} из {pagination.total} заявок
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

