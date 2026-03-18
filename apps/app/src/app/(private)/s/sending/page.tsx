'use client'

import React, { useEffect, useState } from 'react'
import { Loader2, Plus, Edit, ExternalLink, } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useStorekeeper } from '@/contexts/StoreKeeperContext'

const PAGE_SIZE = 20

type Contractor = {
  id: number
  uuid: string | null
  caid: string | null
  title: string | null
  cityName: string | null
}

type BaseMove = {
  id: number
  uuid: string | null
  fullBaid: string | null
  number: string | null
  title: string | null
  laidFrom: string | null
  laidTo: string | null
  statusName: string | null
  createdAt: string | null
  dataIn: {
    client?: string
    contractor?: string
    contractor_caid?: string
    articles_count?: number
    positions_count?: number
    total_price?: number
    cost_price?: number
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
  const { data: storekeeperData, loading: loadingEmployee } = useStorekeeper()
  
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editUuid, setEditUuid] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loadingContractors, setLoadingContractors] = useState(false)
  const [statusTitleByName, setStatusTitleByName] = useState<Record<string, string>>({})
  
  // Form fields
  const [newTitle, setNewTitle] = useState('')
  const [selectedContractor, setSelectedContractor] = useState<string>('')
  const [transportPrice, setTransportPrice] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/store/v2/s/my-sending?page=${page}&limit=${PAGE_SIZE}`, {
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

  // Fetch base move statuses once
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

  // Fetch contractors when dialog opens
  useEffect(() => {
    const fetchContractors = async () => {
      if (!createDialogOpen) return
      
      setLoadingContractors(true)
      try {
        const response = await fetch('/api/store/v2/s/contractors?statusName=ACTIVE&limit=1000', {
          credentials: 'include',
        })
        
        const body = await response.json() as { error?: string; success?: boolean; docs?: Array<{ value: string; label: string; caid: string | null; uuid: string; title: string | null; statusName: string | null }> }

        if (!response.ok) {
          throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
        }
        
        const result = body as { success: boolean; docs: Array<{ value: string; label: string; caid: string | null; uuid: string; title: string | null; statusName: string | null }> }
        
        // Convert to Contractor format for compatibility
        const contractorsList = result.docs.map(item => ({
          id: 0, // Not needed for select
          uuid: item.uuid,
          caid: item.caid,
          title: item.title,
          cityName: null,
        }))
        setContractors(contractorsList)
      } catch (err) {
        console.error('Failed to fetch contractors:', err)
      } finally {
        setLoadingContractors(false)
      }
    }

    if (createDialogOpen) {
      fetchContractors()
    } else {
      // Reset form when sheet closes
      setNewTitle('')
      setSelectedContractor('')
      setTransportPrice('')
      setSelectedDate(undefined)
      setError(null)
    }
  }, [createDialogOpen])

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
  const basePath = '/s/sending'
  const rowOffset = (page - 1) * PAGE_SIZE

  const handleEdit = (uuid: string) => {
    setEditUuid(uuid)
    setSheetOpen(true)
  }

  const handleSheetClose = (open: boolean) => {
    if (!open) {
      setEditUuid(null)
    }
    setSheetOpen(open)
  }

  const handleGoToEdit = (fullBaid: string) => {
    router.push(`/s/sending/edit?full_baid=${fullBaid}`)
  }

  const handleSuccess = () => {
    // Refresh the data after successful create/update
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/store/v2/s/my-sending?page=${page}&limit=${PAGE_SIZE}`, {
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/store/v2/s/sending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newTitle || 'Новая отправка',
          contractorCaid: selectedContractor || undefined,
          transportPrice: transportPrice ? parseFloat(transportPrice) : undefined,
          date: selectedDate ? selectedDate.toISOString() : undefined,
        }),
      })

      const body = await response.json() as { error?: string }

      if (!response.ok) {
        throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
      }

      const result = body as { success: boolean; data: { fullBaid: string } }
      setCreateDialogOpen(false)
      setNewTitle('')
      setSelectedContractor('')
      setTransportPrice('')
      setSelectedDate(undefined)
      router.push(`/s/sending/edit?full_baid=${result.data.fullBaid}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Create button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Отправки</h1>
          <p className="text-sm text-muted-foreground">
            Управление отправками товаров
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Создать отправку
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">№</TableHead>
              <TableHead>Код</TableHead>
              <TableHead>Название отправки</TableHead>
              <TableHead>Клиент</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead className="text-right">Артикулов</TableHead>
              <TableHead className="text-right">Кол-во позиций</TableHead>
              <TableHead className="text-right w-20">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.docs.map((doc, idx) => {
              const displayIndex = rowOffset + idx + 1
              const code = doc.fullBaid || doc.number || doc.uuid || '-'
              const name = doc.title || '-'
              const client = doc.dataIn?.contractor || doc.dataIn?.client || '-'
              const rawStatusName = typeof doc.statusName === 'string' ? doc.statusName : null
              const status = rawStatusName ? statusTitleByName[rawStatusName] || rawStatusName : '-'
              const parsedDate = doc.dataIn?.date ? new Date(doc.dataIn.date) : null
              const date =
                parsedDate && !Number.isNaN(parsedDate.getTime())
                  ? format(parsedDate, 'yyyy-MM-dd')
                  : '-'
              
              // Данные из dataIn
              const articlesCount = doc.dataIn?.articles_count !== undefined 
                ? doc.dataIn.articles_count 
                : '-'
              const positionsCount = doc.dataIn?.positions_count !== undefined 
                ? doc.dataIn.positions_count 
                : '-'
              const totalPrice = doc.dataIn?.total_price !== undefined 
                ? new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 2 }).format(doc.dataIn.total_price)
                : '-'
              const costPrice = doc.dataIn?.cost_price !== undefined 
                ? new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 2 }).format(doc.dataIn.cost_price)
                : '-'

              return (
                <TableRow key={doc.id}>
                  <TableCell>{displayIndex}</TableCell>
                  <TableCell><Link className='text-primary hover:underline cursor-pointer' href={`/s/sending/edit?full_baid=${doc.fullBaid}`}>{code}</Link></TableCell>
                  <TableCell><Link className='text-primary hover:underline cursor-pointer' href={`/s/sending/edit?full_baid=${doc.fullBaid}`}>{name}</Link></TableCell>
                  <TableCell>{client}</TableCell>
                  <TableCell>{status}</TableCell>
                  <TableCell>{date}</TableCell>
                  <TableCell className="text-right">{articlesCount}</TableCell>
                  <TableCell className="text-right">{positionsCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {doc.statusName === 'IN_PROGRESS' && doc.uuid && (
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
            })}
          </TableBody>
        </Table>
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

      {/* Create Sheet */}
      <Sheet open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <SheetContent side="right" className="w-full sm:w-[540px] sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Создать отправку</SheetTitle>
            <SheetDescription>
              Создайте новую отправку товаров
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreate} className="space-y-6 py-6">
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Owner - read-only display */}
            <div className="space-y-2">
              <Label>Владелец</Label>
              <div className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm">
                {loadingEmployee ? (
                  <span className="text-muted-foreground">Загрузка...</span>
                ) : storekeeperData?.human?.fullName ? (
                  <span>{storekeeperData.human.fullName}</span>
                ) : storekeeperData?.employee ? (
                  <span>{storekeeperData.employee.fullEaid || storekeeperData.employee.eaid}</span>
                ) : (
                  <span className="text-muted-foreground">Не найдено</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Владелец определяется автоматически на основе вашего аккаунта
              </p>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Название отправки <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Новая отправка"
                disabled={creating}
                required
              />
            </div>

            {/* Contractor */}
            <div className="space-y-2">
              <Label htmlFor="contractor">Клиент</Label>
              <Select 
                value={selectedContractor} 
                onValueChange={setSelectedContractor}
                disabled={creating || loadingContractors}
              >
                <SelectTrigger id="contractor">
                  <SelectValue placeholder={
                    loadingContractors ? 'Загрузка...' : 'Выберите клиента'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {contractors.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Нет доступных клиентов
                    </div>
                  ) : (
                    contractors.map((contractor) => (
                      <SelectItem key={contractor.caid || contractor.id} value={contractor.caid || String(contractor.id)}>
                        {contractor.title || contractor.caid || `ID: ${contractor.id}`}
                        {contractor.cityName && ` • ${contractor.cityName}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Transport Price */}
            <div className="space-y-2">
              <Label htmlFor="transportPrice">Цена транспортировки</Label>
              <Input
                id="transportPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={transportPrice}
                onChange={(e) => setTransportPrice(e.target.value)}
                disabled={creating}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Дата</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                    disabled={creating}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, 'PPP', { locale: ru })
                    ) : (
                      <span>Выберите дату</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    locale={ru}
                    className="w-55"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <SheetFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={creating || loadingEmployee}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  'Создать'
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

