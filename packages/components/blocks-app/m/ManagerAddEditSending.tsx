'use client'

import React, { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Loader2, CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useManager } from '@/contexts/ManagerContext'

type SendingFormData = {
  title: string
  transportPrice: string
  date: Date | undefined
}

interface ManagerAddEditSendingProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  uuid?: string
  onSuccess?: () => void
}

export function ManagerAddEditSending({ open, onOpenChange, uuid, onSuccess }: ManagerAddEditSendingProps) {
  const { data: managerData, loading: loadingEmployee } = useManager()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<SendingFormData>({
    title: '',
    transportPrice: '',
    date: undefined,
  })

  const isEdit = !!uuid
  const employee = managerData.employee
  const human = managerData.human

  // Fetch existing data when editing
  useEffect(() => {
    const fetchExistingData = async () => {
      if (!isEdit || !uuid || !open) return

      setLoading(true)
      try {
        const response = await fetch(`/api/store/v2/m/sending/${uuid}`, {
          credentials: 'include',
        })

        const body = await response.json() as { error?: string }

        if (!response.ok) {
          throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
        }

        const result = body as {
          success: boolean
          data: {
            title?: string
            dataIn?: {
              title?: string
              transportPrice?: number
              transport_price?: number
              date?: string
            }
          }
        }

        if (result.success && result.data) {
          const data = result.data
          setFormData({
            title: data.dataIn?.title || data.title || '',
            transportPrice: String(data.dataIn?.transportPrice || data.dataIn?.transport_price || ''),
            date: data.dataIn?.date ? new Date(data.dataIn.date) : undefined,
          })
        }
      } catch (err) {
        console.error('Failed to fetch existing data:', err)
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные')
      } finally {
        setLoading(false)
      }
    }

    fetchExistingData()
  }, [isEdit, uuid, open])

  // Reset form when sheet opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        title: '',
        transportPrice: '',
        date: undefined,
      })
      setError(null)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const payload = {
        title: formData.title,
        transportPrice: formData.transportPrice ? parseFloat(formData.transportPrice) : undefined,
        date: formData.date ? formData.date.toISOString() : undefined,
      }

      const url = isEdit 
        ? `/api/store/v2/m/sending/${uuid}`
        : '/api/store/v2/m/sending'
      
      const method = isEdit ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const body = await response.json() as { error?: string }

      if (!response.ok) {
        throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
      }

      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof SendingFormData, value: string | Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Редактировать исходящую машину' : 'Новая исходящая машина'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Обновите информацию об исходящей машине' : 'Создайте новую запись об исходящей машине'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-6">
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Employee - read-only display */}
          <div className="space-y-2">
            <Label>Владелец</Label>
            <div className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm">
              {loadingEmployee ? (
                <span className="text-muted-foreground">Загрузка...</span>
              ) : human?.fullName ? (
                <span>{human.fullName}</span>
              ) : employee ? (
                <span>{employee.fullEaid || employee.eaid}</span>
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
              Название <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="Введите название машины"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
              disabled={loading}
            />
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
              value={formData.transportPrice}
              onChange={(e) => handleChange('transportPrice', e.target.value)}
              disabled={loading}
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
                    !formData.date && 'text-muted-foreground'
                  )}
                  disabled={loading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? (
                    format(formData.date, 'PPP', { locale: ru })
                  ) : (
                    <span>Выберите дату</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center" >
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => handleChange('date', date)}
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
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading || loadingEmployee}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                isEdit ? 'Обновить' : 'Создать'
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

