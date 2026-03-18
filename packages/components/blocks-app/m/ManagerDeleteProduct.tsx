'use client'

import React, { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'

interface ManagerDeleteProductProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  productPaid: string | null
  productTitle: string | null
}

export function ManagerDeleteProduct({
  open,
  onOpenChange,
  onSuccess,
  productPaid,
  productTitle,
}: ManagerDeleteProductProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!productPaid) return

    setError(null)
    setLoading(true)

    try {
      const response = await fetch(`/api/store/v2/m/products/${productPaid}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const body = await response.json() as { error?: string }

      if (!response.ok) {
        throw new Error((body?.error || 'Не удалось удалить товар') as string)
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить товар?</AlertDialogTitle>
          <AlertDialogDescription>
            Вы действительно хотите удалить товар{' '}
            <span className="font-medium text-foreground">
              &quot;{productTitle || productPaid}&quot;
            </span>
            ? Это действие нельзя отменить.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Удаление...
              </>
            ) : (
              'Удалить'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

