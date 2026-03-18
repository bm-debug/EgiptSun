'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, CalendarIcon, Plus, Trash2, Send, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { AddEditInventoryItem } from '@/packages/components/blocks-app/s/AddEditInventoryItem'
import { useStorekeeper } from '@/contexts/StoreKeeperContext'

export type InventoryItem = {
  uuid: string
  variantFullPaid: string
  quantity: number
  hiddenQuantity?: number
  status?: string
  product?: {
    title?: string
  }
  data_in?: {
    quantity?: number
    temp_quantity?: number
  }
}

type Location = {
  laid: string
  fullLaid: string | null
  title: string | null
  city: string | null
  type: string | null
}

type BaseMoveData = {
  id: number
  uuid: string
  fullBaid: string
  number: string | null
  title: string | null
  laidTo: string | null
  statusName: string | null
  xaid: string | null
  createdAt: string | null
  updatedAt: string | null

  dataIn: {
    title?: string
    date?: string
    transportCost?: number
    purchase_price_transport?: number
    owner_eaid?: string
    location_laid?: string
    type?: string
    location?: Location
    items_count?: number
    SKU_count?: number
    [key: string]: any
  } | null
  inventoryItems: InventoryItem[]
}

type Status = {
  name: string
  title: string
  sortOrder: number
}


export default function ReceivingEditPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const fullBaid = searchParams.get('full_baid')
  const { data: storekeeperData } = useStorekeeper()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BaseMoveData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Add item dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  
  // Edit form
  const [editTitle, setEditTitle] = useState('')
  const [editTransportCost, setEditTransportCost] = useState('')
  const [editDate, setEditDate] = useState<Date | undefined>(undefined)
  const [statuses, setStatuses] = useState<Status[]>([])

  const statusTitleByName = useMemo(() => {
    return statuses.reduce<Record<string, string>>((acc, status) => {
      if (status?.name) {
        acc[status.name] = status.title || status.name
      }
      return acc
    }, {})
  }, [statuses])

  const kopecksToInput = (value?: number | null): string => {
    if (value === null || value === undefined) {
      return ''
    }

    const rubles = value / 100
    const formatted = rubles.toFixed(2)
    return formatted.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
  }

  const parseRubInput = (value: string): number | undefined => {
    if (!value || typeof value !== 'string') {
      return undefined
    }

    const normalized = Number(value.replace(/\s+/g, '').replace(',', '.'))
    if (Number.isNaN(normalized)) {
      return undefined
    }

    return normalized
  }

  const formatRubles = (value?: number | null): string => {
    if (value === null || value === undefined) {
      return '-'
    }

    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(value / 100)
  }

  useEffect(() => {
    if (!fullBaid) {
      setError('Параметр full_baid не указан')
      setLoading(false)
      return
    }

    fetchData()
    fetchStatuses()
  }, [fullBaid])

  const fetchStatuses = async () => {
    try {
      const response = await fetch('/api/store/v2/m/statuses?entity=base_moves', {
        credentials: 'include',
      })
      const body = await response.json() as { success?: boolean; statuses?: Status[] }
      if (response.ok && body.statuses) {
        setStatuses(body.statuses)
      }
    } catch (err) {
      console.error('Failed to fetch statuses:', err)
    }
  }

  const fetchData = async () => {
    if (!fullBaid) return
    
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/store/v2/s/receiving/details?full_baid=${encodeURIComponent(fullBaid)}`,
        { credentials: 'include' }
      )

      const body = await response.json() as { error?: string }

      if (!response.ok) {
        throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
      }

      const result = body as { success: boolean; data: BaseMoveData }
      setData(result.data)
      
      // Initialize edit form
      setEditTitle(result.data.dataIn?.title || result.data.title || '')
      const rawTransportCost =
        result.data.dataIn?.transportCost ?? result.data.dataIn?.purchase_price_transport ?? null
      setEditTransportCost(kopecksToInput(rawTransportCost))
      if (result.data.dataIn?.date) {
        setEditDate(new Date(result.data.dataIn.date))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  const handleInventorySuccess = async () => {
    await fetchData()
  }

  const handleRemoveItem = async (itemUuid: string) => {
    if (!fullBaid) return

    setSaving(true)
    try {
      const response = await fetch('/api/store/v2/s/receiving/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_baid: fullBaid,
          action: 'remove_item',
          itemUuid,
        }),
      })

      const body = await response.json() as { error?: string }

      if (!response.ok) {
        throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
      }

      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!fullBaid) return

    setSaving(true)
    try {
      const normalizedTransportCost = parseRubInput(editTransportCost)

      const response = await fetch('/api/store/v2/s/receiving/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_baid: fullBaid,
          action: 'update',
          title: editTitle,
          transportCost: normalizedTransportCost,
          date: editDate ? editDate.toISOString() : undefined,
        }),
      })

      const body = await response.json() as { error?: string }

      if (!response.ok) {
        throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
      }

      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleSendForApproval = async () => {
    if (!fullBaid) return

    setSaving(true)
    try {
      const response = await fetch('/api/store/v2/s/receiving/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_baid: fullBaid,
          action: 'send_for_approval',
        }),
      })

      const body = await response.json() as { error?: string }

      if (!response.ok) {
        throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
      }

      router.push('/s/receiving')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-destructive">Ошибка: {error}</div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const canEdit = data.statusName === 'IN_PROGRESS'

  return (
    <div className="Container mx-auto py-4 md:py-6 space-y-4 md:space-y-6 px-4 md:px-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/s/receiving')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-2xl font-semibold tracking-tight truncate">
              {data.title || data.fullBaid}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground truncate">
              Статус: {data.statusName ? statusTitleByName[data.statusName] || data.statusName : '-'} • {data.fullBaid}
            </p>
          </div>
        </div>
        {canEdit && (
          <Button 
            onClick={handleSendForApproval} 
            disabled={saving}
            className="w-full md:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Отправка...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Отправить на подтверждение</span>
                <span className="sm:hidden">На подтверждение</span>
              </>
            )}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Center: Inventory Table */}
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-base md:text-lg font-semibold">Позиции</h2>
            {canEdit && (
              <Button onClick={() => setAddDialogOpen(true)} size="sm" className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Добавить позицию
              </Button>
            )}
          </div>

          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead className="px-4">№</TableHead>
                  <TableHead className="px-4">Артикул</TableHead>
                  <TableHead className="text-right px-4">Количество</TableHead>
                  {canEdit && <TableHead className="text-right px-4 w-20">Действия</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.inventoryItems.length > 0 ? (
                  data.inventoryItems.map((item, idx) => (
                    <TableRow key={item.uuid}>
                      <TableCell className="px-4">{idx + 1}</TableCell>
                      <TableCell className="px-4">{item.product?.title}</TableCell>
                      <TableCell className="text-right px-4">{item.data_in?.quantity || item.data_in?.temp_quantity}</TableCell>
                      {canEdit && (
                        <TableCell className="px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.uuid)}
                            disabled={saving}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 4 : 3} className="h-24 text-center px-4">
                      Нет позиций
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards - visible only on mobile */}
          <div className="md:hidden space-y-3">
            {data.inventoryItems.length > 0 ? (
              data.inventoryItems.map((item, idx) => (
                <div key={item.uuid} className="border rounded-lg p-4 space-y-2 bg-card">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <div className="font-semibold text-sm text-muted-foreground">№{idx + 1}</div>
                      <div className="font-medium text-sm break-all">{item.variantFullPaid}</div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.uuid)}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Количество: </span>
                    <span className="font-medium">{item.quantity}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Нет позиций
              </div>
            )}
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="space-y-4 order-1 lg:order-2">
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary" className="text-xs sm:text-sm">Сводка</TabsTrigger>
              <TabsTrigger value="edit" className="text-xs sm:text-sm">Редактировать</TabsTrigger>
            </TabsList>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base md:text-lg">Информация</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Основные данные о машине</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm pt-3">
                  <div>
                    <div className="font-medium text-muted-foreground">Код:</div>
                    <div>{data.fullBaid}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Название:</div>
                    <div>{data.title || '-'}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Статус:</div>
                    <div>{data.statusName ? statusTitleByName[data.statusName] || data.statusName : '-'}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Склад:</div>
                    <div>
                      {data.dataIn?.location ? (
                        data.dataIn.location.title || data.dataIn.location.city || data.dataIn.location.laid
                      ) : storekeeperData.location ? (
                        storekeeperData.location.title || storekeeperData.location.city || storekeeperData.location.laid
                      ) : (
                        data.laidTo || '-'
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Дата:</div>
                    <div>
                      {data.dataIn?.date
                        ? format(new Date(data.dataIn.date), 'PPP', { locale: ru })
                        : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Цена транспортировки:</div>
                    <div>{formatRubles(data.dataIn?.transportCost ?? data.dataIn?.purchase_price_transport)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Кол-во позиций:</div>
                    <div>{data.dataIn?.items_count ?? data.inventoryItems.length}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Кол-во Артикулов (SKU):</div>
                    <div>{data.dataIn?.SKU_count ?? '-'}</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Edit Tab */}
            <TabsContent value="edit" className="space-y-4">
              {!canEdit ? (
                <Card>
                  <CardContent className="py-6">
                    <p className="text-xs md:text-sm text-muted-foreground text-center">
                      Редактирование доступно только для записей в статусе {statusTitleByName['IN_PROGRESS'] || 'IN_PROGRESS'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg">Редактирование</CardTitle>
                    <CardDescription className="text-xs md:text-sm">Измените основные параметры</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Название</Label>
                      <Input
                        id="edit-title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-cost">Цена транспортировки</Label>
                      <Input
                        id="edit-cost"
                        type="number"
                        step="0.01"
                        value={editTransportCost}
                        onChange={(e) => setEditTransportCost(e.target.value)}
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Дата</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !editDate && 'text-muted-foreground'
                            )}
                            disabled={saving}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editDate ? format(editDate, 'PPP', { locale: ru }) : 'Выберите дату'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            className="w-55"
                            mode="single"
                            selected={editDate}
                            onSelect={setEditDate}
                            initialFocus
                            locale={ru}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1 order-2 sm:order-1"
                        onClick={() => {
                          setEditTitle(data?.dataIn?.title || data?.title || '')
                          setEditTransportCost(
                            kopecksToInput(
                              data?.dataIn?.transportCost ?? data?.dataIn?.purchase_price_transport ?? null
                            )
                          )
                          setEditDate(data?.dataIn?.date ? new Date(data.dataIn.date) : undefined)
                        }}
                        disabled={saving}
                      >
                        Отмена
                      </Button>
                      <Button className="flex-1 order-1 sm:order-2" onClick={handleSaveEdit} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Сохранение...
                          </>
                        ) : (
                          'Сохранить'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Item Dialog */}
      <AddEditInventoryItem
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        fullBaid={fullBaid || ''}
        onSuccess={handleInventorySuccess}
        locationLaid={
          data?.dataIn?.location?.laid || 
          data?.laidTo || 
          storekeeperData?.location?.laid || 
          null
        }
        existingItems={data?.inventoryItems || []}
      />
    </div>
  )
}

