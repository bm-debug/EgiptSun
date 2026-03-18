'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Edit, ExternalLink } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AddEditReceiving } from '@/packages/components/blocks-app/s/AddEditReceiving'

const PAGE_SIZE = 20

type BaseMove = {
  id: number
  uuid: string | null
  fullBaid: string | null
  number: string | null
  title: string | null
  laidTo: string | null
  statusName: string | null
  createdAt: string | null
  dataIn: {
    articles_count?: number
    positions_count?: number
    items_count?: number
    SKU_count?: number
    car_price?: number
    transportCost?: number
    purchase_price_transport?: number
    [key: string]: any
  } | null
}

type ApiResponse = {
  docs: BaseMove[]
  totalPages: number
  page: number
  totalDocs: number
}

export default function Page() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pageParam = searchParams.get('page')
  const page = Math.max(parseInt(pageParam || '1', 10) || 1, 1)
  
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editUuid, setEditUuid] = useState<string | null>(null)
  const [statusTitleByName, setStatusTitleByName] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true

    const fetchStatuses = async () => {
      try {
        const response = await fetch('/api/store/v2/m/taxonomy?entity=base_moves&limit=200', {
          credentials: 'include',
        })
        const body = await response.json() as { docs?: Array<{ name?: string; title?: string }> }

        if (!active) {
          return
        }

        if (response.ok && Array.isArray(body.docs)) {
          const map = body.docs.reduce<Record<string, string>>((acc, item) => {
            if (item?.name) {
              acc[item.name] = item.title || item.name
            }
            return acc
          }, {})

          setStatusTitleByName(map)
        }
      } catch (err) {
        if (active) {
          console.error('Failed to fetch base move statuses:', err)
        }
      }
    }

    fetchStatuses()

    return () => {
      active = false
    }
  }, [])


  const formatRubles = (value?: number | null): string => {
    if (value === null || value === undefined) {
      return '-'
    }

    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100)
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/store/v2/s/my-receiving?page=${page}&limit=${PAGE_SIZE}`, {
          credentials: 'include',
        })
        
        const body = await response.json() as { error?: string }

        if (!response.ok) {
          throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
        }
        
        setData(body as ApiResponse)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [page])

  const handleSuccess = () => {
    // Refresh the data after successful create/update
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/store/v2/s/my-receiving?page=${page}&limit=${PAGE_SIZE}`, {
          credentials: 'include',
        })
        
        const body = await response.json() as { error?: string }

        if (!response.ok) {
          throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
        }
        
        setData(body as ApiResponse)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center text-red-500">Ошибка: {error}</div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const totalPages = data.totalPages || 1
  const basePath = '/s/receiving'
  const rowOffset = (page - 1) * PAGE_SIZE

  const handleEdit = (uuid: string) => {
    setEditUuid(uuid)
    setSheetOpen(true)
  }

  const handleViewDetails = (fullBaid: string) => {
    router.push(`/s/receiving/edit?full_baid=${fullBaid}`)
  }

  const handleSheetClose = (open: boolean) => {
    if (!open) {
      setEditUuid(null)
    }
    setSheetOpen(open)
  }

  const handleGoToEdit = (fullBaid: string) => {
    router.push(`/s/receiving/edit?full_baid=${fullBaid}`)
  }

  return (
    <>
      <AddEditReceiving 
        open={sheetOpen} 
        onOpenChange={handleSheetClose}
        uuid={editUuid || undefined}
        onSuccess={handleSuccess}
      />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Входящие машины</h1>
            <p className="text-sm text-muted-foreground">Управление приемкой товара</p>
          </div>
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить машину
          </Button>
        </div>
      
      {/* Desktop Table - hidden on mobile */}
      <div className="hidden md:block overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-16 px-4">№</TableHead>
              <TableHead className="px-4">Код</TableHead>
              <TableHead className="px-4">Статус</TableHead>
              <TableHead className="px-4">Навание отправки</TableHead>
              <TableHead className="px-4">Склад</TableHead>
              <TableHead className="px-4">Дата</TableHead>
              <TableHead className="text-right px-4">Артикулов</TableHead>
              <TableHead className="text-right px-4">Кол-во позиций</TableHead>
              <TableHead className="text-right px-4">Цена машины</TableHead>
              <TableHead className="text-right px-4 w-32">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.docs.length > 0 ? (
              data.docs.map((doc, idx) => {
                const displayIndex = rowOffset + idx + 1
                const code = doc.fullBaid || doc.number || doc.uuid || '-'
                const rawStatusName = typeof doc.statusName === 'string' ? doc.statusName : null
                const status = rawStatusName ? statusTitleByName[rawStatusName] || rawStatusName : '-'
                const name = doc.title || '-'
                const warehouse = doc.laidTo || '-'
                
                // Get date from dataIn.date
                let date = '-'
                const dateValue = doc.dataIn?.date
                if (dateValue) {
                  try {
                    const parsedDate = new Date(dateValue)
                    if (!isNaN(parsedDate.getTime())) {
                      date = parsedDate.toLocaleDateString('ru-RU')
                    }
                  } catch (e) {
                    date = '-'
                  }
                }
                
                // Данные из dataIn
                const articlesCount = doc.dataIn?.SKU_count !== undefined 
                  ? doc.dataIn.SKU_count 
                  : (doc.dataIn?.articles_count !== undefined ? doc.dataIn.articles_count : '-')
                const positionsCount = doc.dataIn?.items_count !== undefined 
                  ? doc.dataIn.items_count 
                  : (doc.dataIn?.positions_count !== undefined ? doc.dataIn.positions_count : '-')
                const rawCarPrice = doc.dataIn?.transportCost ?? doc.dataIn?.purchase_price_transport ?? null
                const carPrice = formatRubles(rawCarPrice)

                const canEdit = doc.statusName === 'IN_PROGRESS'

                return (
                  <TableRow key={doc.id} data-state={false}>
                    <TableCell className="px-4">{displayIndex}</TableCell>
                    <TableCell className="px-4">
                      {doc.fullBaid ? (
                        <Link
                          href={`/s/receiving/edit?full_baid=${doc.fullBaid}`}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          {code}
                        </Link>
                      ) : (
                        code
                      )}
                    </TableCell>
                    <TableCell className="px-4">{status}</TableCell>
                    <TableCell className="px-4">{name}</TableCell>
                    <TableCell className="px-4">{warehouse}</TableCell>
                    <TableCell className="px-4">{date}</TableCell>
                    <TableCell className="text-right px-4">{articlesCount}</TableCell>
                    <TableCell className="text-right px-4">{positionsCount}</TableCell>
                    <TableCell className="text-right px-4">{carPrice}</TableCell>
                    <TableCell className="px-4">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && doc.uuid && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(doc.uuid!)}
                            title="Редактировать"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {doc.fullBaid && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGoToEdit(doc.fullBaid!)}
                            title="Перейти к деталям"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center px-4">
                  Нет данных
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards - visible only on mobile */}
      <div className="md:hidden space-y-4">
        {data.docs.length > 0 ? (
          data.docs.map((doc, idx) => {
            const displayIndex = rowOffset + idx + 1
            const code = doc.fullBaid || doc.number || doc.uuid || '-'
            const rawStatusName = typeof doc.statusName === 'string' ? doc.statusName : null
            const status = rawStatusName ? statusTitleByName[rawStatusName] || rawStatusName : '-'
            const name = doc.title || '-'
            const warehouse = doc.laidTo || '-'
            
            // Get date from dataIn.date
            let date = '-'
            const dateValue = doc.dataIn?.date
            if (dateValue) {
              try {
                const parsedDate = new Date(dateValue)
                if (!isNaN(parsedDate.getTime())) {
                  date = parsedDate.toLocaleDateString('ru-RU')
                }
              } catch (e) {
                date = '-'
              }
            }
            
            // Данные из dataIn
            const articlesCount = doc.dataIn?.SKU_count !== undefined 
              ? doc.dataIn.SKU_count 
              : (doc.dataIn?.articles_count !== undefined ? doc.dataIn.articles_count : '-')
            const positionsCount = doc.dataIn?.items_count !== undefined 
              ? doc.dataIn.items_count 
              : (doc.dataIn?.positions_count !== undefined ? doc.dataIn.positions_count : '-')
            const rawCarPrice = doc.dataIn?.transportCost ?? doc.dataIn?.purchase_price_transport ?? null
            const carPrice = formatRubles(rawCarPrice)

            const canEdit = doc.statusName === 'IN_PROGRESS'

            return (
              <div key={doc.id} className="border rounded-lg p-4 space-y-3 bg-card">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="font-semibold text-sm text-muted-foreground">№{displayIndex}</div>
                    <div className="font-medium">{name}</div>
                    {doc.fullBaid ? (
                      <Link
                        href={`/s/receiving/edit?full_baid=${doc.fullBaid}`}
                        className="text-sm text-primary hover:underline cursor-pointer break-all"
                      >
                        {code}
                      </Link>
                    ) : (
                      <div className="text-sm text-muted-foreground">{code}</div>
                    )}
                  </div>
                  <div className="text-sm px-2 py-1 bg-muted rounded">{status}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Склад</div>
                    <div className="font-medium">{warehouse}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Дата</div>
                    <div className="font-medium">{date}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Артикулов</div>
                    <div className="font-medium">{articlesCount}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Позиций</div>
                    <div className="font-medium">{positionsCount}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Цена машины</div>
                    <div className="font-medium">{carPrice}</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  {canEdit && doc.uuid && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(doc.uuid!)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Редактировать
                    </Button>
                  )}
                  {doc.fullBaid && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(doc.fullBaid!)}
                      className="flex-1"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Открыть
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Нет данных
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={page <= 1}
                href={page > 1 ? `${basePath}?page=${page - 1}` : undefined}
              />
            </PaginationItem>

            {page - 1 > 1 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {page > 1 && (
              <PaginationItem>
                <PaginationLink href={`${basePath}?page=${page - 1}`}>{page - 1}</PaginationLink>
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationLink href={`${basePath}?page=${page}`} isActive>
                {page}
              </PaginationLink>
            </PaginationItem>

            {page < totalPages && (
              <PaginationItem>
                <PaginationLink href={`${basePath}?page=${page + 1}`}>{page + 1}</PaginationLink>
              </PaginationItem>
            )}

            {page + 1 < totalPages && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext
                aria-disabled={page >= totalPages}
                href={page < totalPages ? `${basePath}?page=${page + 1}` : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      </div>
    </>
  )
}

