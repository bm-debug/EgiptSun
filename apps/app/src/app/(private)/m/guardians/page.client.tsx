'use client'

import * as React from 'react'
import { useCallback, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { AdminHeader } from '@/packages/components/blocks-app/app-admin/AdminHeader'
import { DbPaginatedResult } from '@/shared/types/shared'
import debounce from 'lodash/debounce'

type RawHuman = {
  uuid: string
  haid: string
  fullName: string
  type?: string | null
  createdAt?: string
  dataIn?: any
  dealDaid?: string
  dealStatusName?: string
}

type GuardianRow = {
  uuid: string
  haid: string
  fullName: string
  phone?: string
  createdAt?: string
  dealDaid?: string
  dealStatusName?: string
}

export default function AdminGuardiansPageClient() {
  const [data, setData] = React.useState<DbPaginatedResult<RawHuman> | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 20,
  })

  // Base fetch function
  const fetchGuardiansBase = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      const response = await fetch(`/api/altrp/v1/admin/guardians?${params.toString()}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch guardians: ${response.statusText}`)
      }

      const result: DbPaginatedResult<RawHuman> = await response.json()

      setData(result)
    } catch (err) {
      console.error('Guardians fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load guardians')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit])

  // Debounced version of fetchGuardians
  const fetchGuardians = useMemo(
    () => debounce(fetchGuardiansBase, 300),
    [fetchGuardiansBase]
  )

  useEffect(() => {
    fetchGuardians()

    // Cleanup debounced function on unmount
    return () => {
      fetchGuardians.cancel()
    }
  }, [fetchGuardians])

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
  }

  const guardians = data?.docs || []

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const mappedGuardians: GuardianRow[] = guardians.map((h) => {
    const dataIn = normalizeDataIn(h.dataIn)
    return {
      uuid: h.uuid,
      haid: h.haid,
      fullName: h.fullName,
      phone: dataIn?.phone,
      createdAt: h.createdAt,
      dealDaid: (h as any).dealDaid,
      dealStatusName: (h as any).dealStatusName,
    }
  })

  if (error) {
    return (
      <>
        <AdminHeader title="Поручители" />
        <main className="flex-1 overflow-y-auto">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Поручители" />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Поручители</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Поручители</CardTitle>
            </CardHeader>
            <CardContent>
              {mappedGuardians.length === 0 && !loading ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Поручители не найдены
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ФИО</TableHead>
                        <TableHead>Телефон</TableHead>
                        <TableHead>Создан</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappedGuardians.map((g) => (
                        <TableRow key={g.uuid}>
                          <TableCell className="font-medium">{g.fullName || 'Не указано'}</TableCell>
                          <TableCell>{g.phone || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(g.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {data && data.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Показано {((data.pagination.page - 1) * data.pagination.limit) + 1} - {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} из {data.pagination.total}
                      </div>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => handlePageChange(data.pagination.page - 1)}
                              className={data.pagination.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                          {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                            let pageNum: number | string
                            if (data.pagination.totalPages <= 5) {
                              pageNum = i + 1
                            } else if (data.pagination.page <= 3) {
                              pageNum = i + 1
                            } else if (data.pagination.page >= data.pagination.totalPages - 2) {
                              pageNum = data.pagination.totalPages - 4 + i
                            } else {
                              pageNum = data.pagination.page - 2 + i
                            }

                            if (pageNum < 1 || pageNum > data.pagination.totalPages) return null

                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  onClick={() => handlePageChange(pageNum as number)}
                                  isActive={pageNum === data.pagination.page}
                                  className="cursor-pointer"
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            )
                          })}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => handlePageChange(data.pagination.page + 1)}
                              className={data.pagination.page >= data.pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}

function normalizeDataIn(raw: any): Record<string, any> | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (typeof raw === 'object') return raw as Record<string, any>
  return null
}

