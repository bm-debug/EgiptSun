'use client'

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { DbFilters } from '@/shared/types/shared'
import qs from 'qs'

type Category = {
  name: string
  title: string
}

type Status = {
  name: string
  title: string
}

type Location = {
  laid: string
  title: string
}

type Product = {
  paid: string
  title: string | null
  category: string | null
  statusName: string | null
  data_in?: {
    warehouse_laid?: string
    price?: number
    reduced_limit?: number
    [key: string]: any
  } | null
}

interface ManagerProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  product?: {
    paid: string
    title: string | null
    category: string | null
    statusName: string | null
    data_in?: {
      warehouse_laid?: string
      price?: number
      reduced_limit?: number
      [key: string]: any
    } | null
  } | null
}

export function ManagerProductForm({ 
  open, 
  onOpenChange, 
  onSuccess,
  product = null
}: ManagerProductFormProps) {
  const [loading, setLoading] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingStatuses, setLoadingStatuses] = useState(true)
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const [title, setTitle] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [price, setPrice] = useState<string>('')
  const [reducedLimit, setReducedLimit] = useState<string>('')

  const isEditMode = !!product

  // Load product data when editing
  useEffect(() => {
    if (product && open) {
      
      setTitle(product.title || '')
      setSelectedCategory(product.category || '')
      setSelectedStatus(product.statusName || '')
      // Only set warehouse if it has a value (not empty string)
      const warehouseLaid = product.data_in?.warehouse_laid
      console.log('Setting location to:', warehouseLaid)
      setSelectedLocation(warehouseLaid && warehouseLaid !== '' ? warehouseLaid : '')
      setPrice(product.data_in?.price?.toString() || '')
      setReducedLimit(product.data_in?.reduced_limit?.toString() || '')
    }
  }, [product, open])

  // Fetch categories from taxonomy
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true)
      try {
        const queryParams = qs.stringify({
          entity: 'products.categories',
          limit: 1000,
        }, { arrayFormat: 'brackets' })
        const response = await fetch(`/api/store/v2/m/taxonomy?${queryParams}`, {
          credentials: 'include',
        })
        
        const body = await response.json() as { error?: string }

        if (!response.ok) {
          throw new Error((body?.error || 'Не удалось загрузить категории') as string)
        }
        
        const result = body as { docs: Category[] }
        setCategories(result.docs || [])
      } catch (err) {
        console.error('Failed to fetch categories:', err)
      } finally {
        setLoadingCategories(false)
      }
    }

    if (open) {
      fetchCategories()
    }
  }, [open])

  // Fetch statuses from taxonomy
  useEffect(() => {
    const fetchStatuses = async () => {
      setLoadingStatuses(true)
      try {
        const queryParams = qs.stringify({
          entity: 'products',
          limit: 1000,
          filters: {
            conditions: [
              {
                field: 'name',
                operator: 'exclude',
                values: [
                  'ARCHIEVED', 
                  'CANCELLED',
                  'ON_PAUSE',
                  'COMPLETED',
                  'ACTIVE',
                  'IN_PROGRESS',
                  'ON_APPROVAL',
                ],
              },
            ],
          } as DbFilters,
        }, { arrayFormat: 'brackets' })
        const response = await fetch(`/api/store/v2/m/taxonomy?${queryParams}`, {
          credentials: 'include',
        })
        const body = await response.json() as { error?: string }

        if (!response.ok) {
          throw new Error((body?.error || 'Не удалось загрузить статусы') as string)
        }
        
        const result = body as { docs: Status[] }
        setStatuses(result.docs || [])
      } catch (err) {
        console.error('Failed to fetch statuses:', err)
      } finally {
        setLoadingStatuses(false)
      }
    }

    if (open) {
      fetchStatuses()
    }
  }, [open])

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true)
      try {
        const response = await fetch('/api/store/v2/m/locations', {
          credentials: 'include',
        })
        
        const body = await response.json() as { error?: string }

        if (!response.ok) {
          throw new Error((body?.error || 'Не удалось загрузить склады') as string)
        }
        
        const result = body as { locations: Location[] }
        setLocations(result.locations || [])
      } catch (err) {
        console.error('Failed to fetch locations:', err)
      } finally {
        setLoadingLocations(false)
      }
    }

    if (open) {
      fetchLocations()
    }
  }, [open])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTitle('')
      setSelectedCategory('')
      setSelectedStatus('')
      setSelectedLocation('')
      setPrice('')
      setReducedLimit('')
      setError(null)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!title || !selectedCategory || !selectedStatus || !selectedLocation) {
        throw new Error('Заполните все обязательные поля')
      }

      const payload = {
        title,
        category: selectedCategory,
        statusName: selectedStatus,
        data_in: {
          warehouse_laid: selectedLocation,
          price: price ? parseFloat(price) : undefined,
          reduced_limit: reducedLimit ? parseFloat(reducedLimit) : undefined,
        },
      }

      const url = isEditMode 
        ? `/api/store/v2/m/products/${product?.paid}`
        : '/api/store/v2/m/products'
      
      const method = isEditMode ? 'PATCH' : 'POST'

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
        throw new Error((body?.error || 'Неизвестная ошибка') as string)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-screen h-screen sm:h-auto p-0 gap-0 flex flex-col">
        <DialogHeader className="px-4 pt-6 pb-2 sm:px-6 flex-shrink-0">
          <DialogTitle className="text-base sm:text-lg">
            {isEditMode ? 'Редактировать товар' : 'Добавить товар'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isEditMode 
              ? 'Измените информацию о товаре' 
              : 'Заполните информацию о новом товаре'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 py-4 px-4 sm:px-6 flex-1 overflow-y-auto">
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">
                Название <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                required
                placeholder="Введите название товара"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Категория <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={selectedCategory} 
                onValueChange={setSelectedCategory}
                disabled={loading || loadingCategories}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder={
                    loadingCategories ? 'Загрузка...' : 'Выберите категорию'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Нет доступных категорий
                    </div>
                  ) : (
                    categories.map((category) => (
                      <SelectItem key={category.name} value={category.name}>
                        {category.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Статус <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={selectedStatus} 
                onValueChange={setSelectedStatus}
                disabled={loading || loadingStatuses}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder={
                    loadingStatuses ? 'Загрузка...' : 'Выберите статус'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {statuses.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Нет доступных статусов
                    </div>
                  ) : (
                    statuses.map((status) => (
                      <SelectItem key={status.name} value={status.name}>
                        {status.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">
                Склад <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={selectedLocation} 
                onValueChange={setSelectedLocation}
                disabled={loading || loadingLocations}
              >
                <SelectTrigger id="location">
                  <SelectValue placeholder={
                    loadingLocations ? 'Загрузка...' : 'Выберите склад'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {locations.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Нет доступных складов
                    </div>
                  ) : (
                    locations.map((location) => (
                      <SelectItem key={location.laid} value={location.laid}>
                        {location.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">
                Торговая цена
              </Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={loading}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reducedLimit">
                Предел уменьшения
              </Label>
              <Input
                id="reducedLimit"
                type="number"
                min="0"
                step="1"
                value={reducedLimit}
                onChange={(e) => setReducedLimit(e.target.value)}
                disabled={loading}
                placeholder="1"
              />
            </div>
          </div>

          <DialogFooter className="px-4 py-4 sm:px-6 flex-shrink-0 border-t flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={!title || !selectedCategory || !selectedStatus || !selectedLocation || loading || loadingCategories || loadingStatuses || loadingLocations}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Сохранение...' : 'Добавление...'}
                </>
              ) : (
                isEditMode ? 'Сохранить' : 'Добавить'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

