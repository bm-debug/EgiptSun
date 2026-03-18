'use client'

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { useStorekeeper } from '@/contexts/StoreKeeperContext'

type Product = {
  paid: string
  title: string | null
  category: string | null
  dataIn?: {
    sku?: string
    [key: string]: any
  } | null
}

type InventoryStatus = {
  value: string
  label: string
  sortOrder?: number | null
}

interface AddInventoryToLocationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddInventoryToLocation({ 
  open, 
  onOpenChange, 
  onSuccess 
}: AddInventoryToLocationProps) {
  const { data: storekeeperData } = useStorekeeper()
  const [loading, setLoading] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingStatuses, setLoadingStatuses] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [statuses, setStatuses] = useState<InventoryStatus[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('1')
  const [selectedStatus, setSelectedStatus] = useState<string>('INCOME_INV')
  const [notes, setNotes] = useState<string>('')
  const [availableQuantity, setAvailableQuantity] = useState<number | null>(null)

  const locationLaid = storekeeperData?.location?.laid

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true)
      try {
        // API automatically filters by current employee's location
        const params = new URLSearchParams({ page: '1', limit: '1000' })
        
        const response = await fetch(`/api/store/v2/s/products?${params}`, {
          credentials: 'include',
        })
        
        const body = await response.json() as { error?: string }

        if (!response.ok) {
          throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
        }
        
        const result = body as { docs: Product[] }
        setProducts(result.docs || [])
      } catch (err) {
        console.error('Failed to fetch products:', err)
        setError(err instanceof Error ? err.message : 'Не удалось загрузить товары')
      } finally {
        setLoadingProducts(false)
      }
    }

    if (open) {
      fetchProducts()
    }
  }, [open, locationLaid])

  // Fetch inventory statuses
  useEffect(() => {
    const fetchStatuses = async () => {
      setLoadingStatuses(true)
      try {
        const response = await fetch('/api/store/v2/s/inventory-statuses', {
          credentials: 'include',
        })
        
        const body = await response.json() as { error?: string }

        if (!response.ok) {
          throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
        }
        
        const result = body as { success: boolean; data: InventoryStatus[] }
        setStatuses(result.data || [])
      } catch (err) {
        console.error('Failed to fetch statuses:', err)
        // Use fallback statuses
        setStatuses([
          { value: 'INCOME_INV', label: 'Приход' },
          { value: 'EXPENSE_INV', label: 'Расход' },
          { value: 'MANUFACTURING_INV', label: 'Производство' },
          { value: 'UNAVAILABLE', label: 'Недоступно' },
          { value: 'COMMITTED_INV', label: 'Зарезервировано' },
          { value: 'DISPOSAL_INV', label: 'Списание' },
          { value: 'IN_TRANSPORTING_INV', label: 'В транспортировке' },
          { value: 'RETURN_INV', label: 'Возврат' },
        ])
      } finally {
        setLoadingStatuses(false)
      }
    }

    if (open) {
      fetchStatuses()
    }
  }, [open])

  // Fetch available quantity when product changes
  useEffect(() => {
    const fetchAvailableQuantity = async () => {
      if (!selectedProduct || !locationLaid) {
        setAvailableQuantity(null)
        return
      }

      try {
        // TODO: Create API endpoint to get available quantity
        // For now, just reset
        setAvailableQuantity(null)
      } catch (err) {
        console.error('Failed to fetch available quantity:', err)
      }
    }

    if (selectedProduct) {
      fetchAvailableQuantity()
    }
  }, [selectedProduct, locationLaid])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedProduct('')
      setQuantity('1')
      setSelectedStatus('INCOME_INV')
      setNotes('')
      setError(null)
      setAvailableQuantity(null)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!selectedProduct || !quantity || !selectedStatus) {
        throw new Error('Заполните все обязательные поля')
      }

      if (!locationLaid) {
        throw new Error('Склад не определён')
      }

      const payload = {
        variantFullPaid: selectedProduct,
        quantity: parseFloat(quantity),
        status: selectedStatus,
        notes: notes || undefined,
      }

      const response = await fetch('/api/store/v2/s/inventory/add', {
        method: 'POST',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-screen h-screen sm:h-auto p-0 gap-0 flex flex-col">
        <DialogHeader className="px-4 pt-6 pb-2 sm:px-6 flex-shrink-0">
          <DialogTitle className="text-base sm:text-lg">
            Добавить товар на склад
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Добавьте товар с указанием статуса инвентаризации
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 py-4 px-4 sm:px-6 flex-1 overflow-y-auto">
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {locationLaid && (
              <div className="rounded-lg border border-muted bg-muted/50 p-3 text-sm text-muted-foreground">
                📦 Склад: {storekeeperData?.location?.title || locationLaid}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="product">
                Товар <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={selectedProduct} 
                onValueChange={setSelectedProduct}
                disabled={loading || loadingProducts}
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder={
                    loadingProducts ? 'Загрузка...' : 'Выберите товар'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {products.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      {locationLaid 
                        ? 'Нет доступных товаров для этого склада' 
                        : 'Нет доступных товаров'}
                    </div>
                  ) : (
                    products.map((product) => {
                      const sku = product.dataIn?.sku || product.paid
                      
                      return (
                        <SelectItem key={product.paid} value={product.paid}>
                          {product.title || product.paid} • {sku}
                        </SelectItem>
                      )
                    })
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
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">
                Количество <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={loading}
                required
              />
              {availableQuantity !== null && (
                <p className="text-xs text-muted-foreground">
                  Доступно: {availableQuantity}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">
                Примечания
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                placeholder="Опциональные заметки..."
                rows={3}
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
              disabled={!selectedProduct || !quantity || !selectedStatus || loading || loadingProducts || loadingStatuses}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Добавление...
                </>
              ) : (
                'Добавить'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

