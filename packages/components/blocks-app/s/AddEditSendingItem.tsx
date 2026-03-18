'use client'

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

type Product = {
  paid: string
  title: string | null
  category: string | null
  dataIn?: {
    sku?: string
    [key: string]: any
  } | null
  inventory?: {
    available: number
    in_transporting: number
    unavailable: number
    commited: number
  }
}

type SendingItem = {
  uuid: string
  variantFullPaid: string
  quantity: number
  sellingPriceFact?: number
  purchasePriceFact?: number
}

interface AddEditSendingItemProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fullBaid: string
  item?: SendingItem
  onSuccess?: () => void
  laidFrom?: string | null
  existingItems?: SendingItem[]
}

export function AddEditSendingItem({ 
  open, 
  onOpenChange, 
  fullBaid,
  item,
  onSuccess,
  laidFrom,
  existingItems = []
}: AddEditSendingItemProps) {
  const [loading, setLoading] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('1')
  const [notes, setNotes] = useState<string>('')

  const isEdit = !!item

  // Filter out products that are already added (except when editing)
  const availableProducts = products.filter(product => {
    // When editing, allow the current item's product
    if (isEdit && item && product.paid === item.variantFullPaid) {
      return true
    }
    // Filter out products that are already in the machine
    const isAlreadyAdded = existingItems.some(existingItem => 
      existingItem.variantFullPaid === product.paid
    )
    return !isAlreadyAdded
  })

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true)
      try {
        // API automatically filters by current employee's location
        const params = new URLSearchParams({ 
          page: '1', 
          limit: '1000',
          withInventory: 'true'
        })
        
        const response = await fetch(`/api/store/v2/s/products?${params}`, {
          credentials: 'include',
        })
        
        const body = await response.json() as { error?: string }

        if (!response.ok) {
          throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
        }
        
        const result = body as { docs: Product[] }
        // Filter out products with available = 0
        const availableProducts = (result.docs || []).filter(product => {
          return product.inventory && product.inventory.available > 0
        })
        setProducts(availableProducts)
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
  }, [open])

  // Initialize form when editing
  useEffect(() => {
    if (item && open) {
      setSelectedProduct(item.variantFullPaid)
      setQuantity(String(item.quantity))
    }
  }, [item, open])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedProduct('')
      setQuantity('1')
      setNotes('')
      setError(null)
    }
  }, [open])

  // Get available quantity for selected product
  const selectedProductData = products.find(p => p.paid === selectedProduct)
  const availableQuantity = selectedProductData?.inventory?.available ?? null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!selectedProduct || !quantity) {
        throw new Error('Заполните все обязательные поля')
      }

      // Validate quantity against available inventory
      const quantityNum = parseFloat(quantity)
      if (availableQuantity !== null && quantityNum > availableQuantity) {
        throw new Error(`Недостаточно товара на складе. Доступно: ${availableQuantity}`)
      }

      const payload = {
        full_baid: fullBaid,
        action: isEdit ? 'update_item' : 'add_item',
        variantFullPaid: selectedProduct,
        quantity: parseFloat(quantity),
        notes: notes || undefined,
        ...(isEdit && item ? { itemUuid: item.uuid } : {}),
      }

      const response = await fetch('/api/store/v2/s/sending/details', {
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
            {isEdit ? 'Редактировать позицию' : 'Добавить позицию'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isEdit 
              ? 'Измените параметры позиции отправки' 
              : 'Выберите вариант товара и укажите количество для отправки'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 py-4 px-4 sm:px-6 flex-1 overflow-y-auto">
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {laidFrom && (
              <div className="rounded-lg border border-muted bg-muted/50 p-3 text-sm text-muted-foreground">
                📤 Отправка со склада: {laidFrom}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="product">
                Товар <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={selectedProduct} 
                onValueChange={setSelectedProduct}
                disabled={loading || loadingProducts || isEdit}
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder={
                    loadingProducts ? 'Загрузка...' : 'Выберите товар'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      {products.length === 0 
                        ? (laidFrom 
                            ? 'Нет доступных товаров для этого склада' 
                            : 'Нет доступных товаров')
                        : 'Все товары уже добавлены в машину'}
                    </div>
                  ) : (
                    availableProducts.map((product) => {
                      const sku = product.dataIn?.sku || product.paid
                      const available = product.inventory?.available ?? 0
                      
                      return (
                        <SelectItem key={product.paid} value={product.paid}>
                          {product.title || product.paid} • {sku} • Доступно: {available}
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
              {isEdit && (
                <p className="text-xs text-muted-foreground">
                  Товар нельзя изменить при редактировании
                </p>
              )}
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
                max={availableQuantity !== null ? availableQuantity : undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={loading}
                required
              />
              {availableQuantity !== null && (
                <p className="text-xs text-muted-foreground">
                  Максимум: {availableQuantity}
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
              disabled={!selectedProduct || !quantity || loading || loadingProducts}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? 'Сохранение...' : 'Добавление...'}
                </>
              ) : (
                isEdit ? 'Сохранить' : 'Добавить'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

