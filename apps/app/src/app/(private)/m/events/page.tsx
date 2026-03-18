'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Search } from 'lucide-react'
import { AdminHeader } from '@/packages/components/blocks-app/app-admin/AdminHeader'
import { DbPaginatedResult } from '@/shared/types/shared'
import { JOURNAL_ACTION_NAMES, JOURNAL_ACTION_FILTER_OPTIONS } from '@/shared/constants/journal-actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Event {
  id: string
  uuid: string
  type: string
  description: string
  date: string
  action?: string
}

export default function AdminEventsPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<DbPaginatedResult<Event> | null>(null)
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 15,
  })
  const [selectedAction, setSelectedAction] = React.useState<string>('all')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('')

  // Set page title
  React.useEffect(() => {
    document.title = 'События'
  }, [])

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setPagination((prev) => ({ ...prev, page: 1 }))
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch events
  React.useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
          orderBy: 'createdAt',
          orderDirection: 'desc',
        })

        if (selectedAction && selectedAction !== 'all') {
          params.append('action', selectedAction)
        }

        const response = await fetch(`/api/altrp/v1/admin/journals?${params.toString()}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch events')
        }

        const result = (await response.json()) as {
          success: boolean
          data?: {
            docs: Array<{
              uuid?: string
              id: number
              action: string
              details: string | Record<string, unknown>
              createdAt?: string
            }>
            pagination?: {
              total: number
              page: number
              limit: number
              totalPages: number
            }
          }
        }

        if (!result.success || !result.data) {
          throw new Error('Invalid response format')
        }

        const journals = result.data.docs || []
        const paginationInfo = result.data.pagination || {
          total: 0,
          page: 1,
          limit: 15,
          totalPages: 1,
        }

        // Transform journals to events format
        const events: Event[] = journals.map((journal) => {
          const rawDetails =
            typeof journal.details === 'string'
              ? (JSON.parse(journal.details) as Record<string, unknown>)
              : (journal.details as Record<string, unknown> | undefined)

          const actionType = journal.action || 'Событие'

          // Use shared action names mapping
          const type = JOURNAL_ACTION_NAMES[journal.action] || journal.action || actionType

          let description: string

          // Use description from details if available
          if (rawDetails && 'description' in rawDetails && typeof rawDetails.description === 'string') {
            description = rawDetails.description
          } else {
            // Fallback: use action type or message
            const details = rawDetails as { message?: string; context?: string } | undefined
            const message = details?.message || details?.context || actionType
            description = message || `${actionType} #${journal.uuid?.substring(0, 8) || journal.id}`
          }

          return {
            id: journal.uuid || `journal-${journal.id}`,
            uuid: journal.uuid || `journal-${journal.id}`,
            type,
            description,
            date: journal.createdAt || new Date().toISOString(),
            action: journal.action,
          }
        })

        setData({
          docs: events,
          pagination: paginationInfo,
        })

        setLoading(false)
      } catch (err) {
        console.error('Events fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load events')
        setLoading(false)
      }
    }

    fetchEvents()
  }, [pagination.page, pagination.limit, selectedAction])

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return ''

    let utcDateString = dateString.trim()

    if (utcDateString.includes(' ') && !utcDateString.includes('T')) {
      utcDateString = utcDateString.replace(' ', 'T') + 'Z'
    } else if (utcDateString.includes('T') && !utcDateString.includes('Z') && !utcDateString.match(/[+-]\d{2}:?\d{2}$/)) {
      utcDateString = utcDateString + 'Z'
    }

    const parsedDate = new Date(utcDateString)

    if (isNaN(parsedDate.getTime())) {
      return 'неизвестно'
    }

    const now = new Date()
    const diffMs = now.getTime() - parsedDate.getTime()

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

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  // Filter events by search query (client-side filtering for current page only)
  // This hook must be called before any conditional returns to follow Rules of Hooks
  const filteredEvents = React.useMemo(() => {
    if (!data?.docs) return []
    if (!debouncedSearchQuery) return data.docs
    
    const query = debouncedSearchQuery.toLowerCase()
    return data.docs.filter(
      (event) =>
        event.type.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query)
    )
  }, [data?.docs, debouncedSearchQuery])

  const totalPages = data?.pagination?.totalPages || 1
  const currentPage = data?.pagination?.page || 1
  const total = data?.pagination?.total || 0

  if (loading && !data) {
    return (
      <>
        <AdminHeader title="События" />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </>
    )
  }

  if (error && !data) {
    return (
      <>
        <AdminHeader title="События" />
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
      <AdminHeader title="События" />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">События</h1>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[300px]"
                />
              </div>
              <Select
                value={selectedAction}
                onValueChange={(value) => {
                  setSelectedAction(value)
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Все типы" />
                </SelectTrigger>
                <SelectContent>
                  {JOURNAL_ACTION_FILTER_OPTIONS.map((actionType) => (
                    <SelectItem key={actionType.value} value={actionType.value}>
                      {actionType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Все события</CardTitle>
            </CardHeader>
            <CardContent>
              {!data || filteredEvents.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {debouncedSearchQuery ? 'События не найдены' : 'Нет событий'}
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
                    {filteredEvents.map((event) => (
                      <TableRow
                        key={event.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/m/events/${event.uuid}`)}
                      >
                        <TableCell className="font-medium"><Link href={`/m/events/${event.uuid}`}>{event.type}</Link></TableCell>
                        <TableCell>{event.description}</TableCell>
                        <TableCell className="text-muted-foreground" title={formatDate(event.date)}>
                          {formatTimeAgo(event.date)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {totalPages > 1 && !debouncedSearchQuery && (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <div>
                    Показано {filteredEvents.length} из {total} событий
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentPage > 1) {
                          setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                        }
                      }}
                      disabled={currentPage <= 1}
                    >
                      Предыдущая
                    </Button>
                    <span>
                      Страница {currentPage} из {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentPage < totalPages) {
                          setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                        }
                      }}
                      disabled={currentPage >= totalPages}
                    >
                      Следующая
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}

