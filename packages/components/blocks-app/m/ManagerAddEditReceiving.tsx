'use client'

import React, { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Loader2, CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useManager } from '@/contexts/ManagerContext'

type ReceivingFormData = {
  title: string
  transportCost: string
  date: Date | undefined
  ownerEaid: string
}

type Employee = {
  id: number
  uuid: string
  eaid: string
  fullEaid: string | null
  dataIn: any
  human: {
    uuid: string
    haid: string
    fullName: string | null
  } | null
}

interface ManagerAddEditReceivingProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  uuid?: string
  onSuccess?: () => void
}

export function ManagerAddEditReceiving({ open, onOpenChange, uuid, onSuccess }: ManagerAddEditReceivingProps) {
  const { data: managerData, loading: loadingEmployee } = useManager()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<ReceivingFormData>({
    title: '',
    transportCost: '',
    date: undefined,
    ownerEaid: '',
  })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

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

  const isEdit = !!uuid
  const employee = managerData.employee
  const human = managerData.human
  const location = managerData.location

  // Fetch existing data when editing
  useEffect(() => {
    const fetchExistingData = async () => {
      if (!isEdit || !uuid || !open) return

      setLoading(true)
      try {
        const response = await fetch(`/api/store/v2/m/receiving/${uuid}`, {
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
            xaid?: string
            dataIn?: {
              title?: string
              transportCost?: number
              purchase_price_transport?: number
              date?: string
              owner_eaid?: string
            }
          }
        }

        if (result.success && result.data) {
          const data = result.data
          setFormData({
            title: data.dataIn?.title || data.title || '',
            transportCost: kopecksToInput(
              data.dataIn?.transportCost ?? data.dataIn?.purchase_price_transport ?? null
            ),
            date: data.dataIn?.date ? new Date(data.dataIn.date) : undefined,
            ownerEaid: data.dataIn?.owner_eaid || data.xaid || '',
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

  // Fetch employees when opening
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!open) return
      
      setLoadingEmployees(true)
      try {
        const response = await fetch('/api/store/v2/m/employees?role=storekeeper', {
          credentials: 'include',
        })
        
        const body = await response.json() as { success?: boolean; employees?: Employee[] }

        if (!response.ok) {
          throw new Error('Не удалось загрузить сотрудников')
        }
        
        if (body.employees) {
          setEmployees(body.employees)
          
          // Set current user as default owner if not editing and owner not set
          if (!isEdit && !formData.ownerEaid && managerData?.employee?.eaid) {
            const currentEmployee = body.employees.find(
              emp => emp.eaid === managerData.employee?.eaid
            )
            if (currentEmployee) {
              setFormData(prev => ({ ...prev, ownerEaid: currentEmployee.eaid }))
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch employees:', err)
      } finally {
        setLoadingEmployees(false)
      }
    }

    if (open) {
      fetchEmployees()
    }
  }, [open, isEdit])

  // Reset form when sheet opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        title: '',
        transportCost: '',
        date: undefined,
        ownerEaid: '',
      })
      setError(null)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate required fields
    if (!formData.ownerEaid) {
      setError('Поле "Владелец" обязательно для заполнения')
      return
    }

    setLoading(true)

    try {
      const payload = {
        title: formData.title,
        transportCost: parseRubInput(formData.transportCost),
        date: formData.date ? formData.date.toISOString() : undefined,
        ownerEaid: formData.ownerEaid,
      }  
 
      const url = isEdit 
        ? `/api/store/v2/m/receiving/${uuid}`
        : '/api/store/v2/m/receiving'
      
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

  const handleChange = (field: keyof ReceivingFormData, value: string | Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Редактировать входящую машину' : 'Новая входящая машина'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Обновите информацию о входящей машине' : 'Создайте новую запись о входящей машине'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-6">
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Owner - selectable */}
          <div className="space-y-2">
            <Label htmlFor="owner">
              Владелец <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={formData.ownerEaid} 
              onValueChange={(value) => handleChange('ownerEaid', value)}
              disabled={loading || loadingEmployees}
              required
            >
              <SelectTrigger id="owner">
                <SelectValue placeholder={
                  loadingEmployees ? 'Загрузка...' : 'Выберите владельца'
                } />
              </SelectTrigger>
              <SelectContent>
                {employees.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    Нет доступных сотрудников
                  </div>
                ) : (
                  employees.map((emp) => (
                    <SelectItem key={emp.eaid} value={emp.eaid}>
                      {emp.human?.fullName || emp.fullEaid || emp.eaid}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Выберите сотрудника-владельца машины
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

          {/* Transport Cost */}
          <div className="space-y-2">
            <Label htmlFor="transportCost">Цена транспортировки</Label>
            <Input
              id="transportCost"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.transportCost}
              onChange={(e) => handleChange('transportCost', e.target.value)}
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
            <Button type="submit" disabled={loading || loadingEmployees || !formData.ownerEaid}>
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

