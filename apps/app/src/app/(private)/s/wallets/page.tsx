'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const PAGE_SIZE = 20

type Wallet = {
  id: number
  uuid: string | null
  title: string | { ru?: string; en?: string } | null
  waid: string | null
  targetAid: string | null
  dataIn: {
    owner?: string
    balance?: number
    [key: string]: any
  } | null
}

type ApiResponse = {
  docs: Wallet[]
  totalPages: number
  page: number
  totalDocs: number
}

export default function Page() {
  const searchParams = useSearchParams()
  const pageParam = searchParams.get('page')
  const page = Math.max(parseInt(pageParam || '1', 10) || 1, 1)
  
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formWallet, setFormWallet] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  const fetchData = useCallback(async (withLoader = true) => {
    if (withLoader) {
      setLoading(true)
    }
    setError(null)

    try {
      const response = await fetch(`/api/store/v2/s/wallets?page=${page}&limit=${PAGE_SIZE}`, {
        credentials: 'include',
      })

      const body = await response.json() as { error?: string }

      if (!response.ok) {
        throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
      }

      const result = body as ApiResponse
      setData(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data'
      setError(message)
      return null
    } finally {
      if (withLoader) {
        setLoading(false)
      }
    }
  }, [page])

  useEffect(() => {
    fetchData().catch(() => undefined)
  }, [fetchData])

  useEffect(() => {
    if (!data?.docs?.length) {
      setFormWallet('')
      return
    }

    if (!formWallet || !data.docs.some((wallet) => wallet.waid === formWallet)) {
      const firstWallet = data.docs.find((wallet) => Boolean(wallet.waid))
      setFormWallet(firstWallet?.waid ?? '')
    }
  }, [data, formWallet])

  const resolveTitle = useCallback((wallet: Wallet) => {
    if (!wallet.title) {
      return '-'
    }

    if (typeof wallet.title === 'string') {
      return wallet.title
    }

    if (wallet.title.ru) {
      return wallet.title.ru
    }

    if (wallet.title.en) {
      return wallet.title.en
    }

    return '-'
  }, [])

  const walletOptions = useMemo(() => {
    if (!data?.docs) {
      return [] as Array<{ value: string; label: string }>
    }

    return data.docs
      .filter((wallet): wallet is Wallet & { waid: string } => Boolean(wallet.waid))
      .map((wallet) => ({
        value: wallet.waid!,
        label: `${resolveTitle(wallet)}${wallet.waid ? ` (${wallet.waid})` : ''}${wallet.targetAid ? ` - ${wallet.targetAid}` : ''}`,
      }))
  }, [data, resolveTitle])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!formWallet) {
      setFormError('Выберите кошелёк')
      return
    }

    const normalizedAmount = Number(String(amount).replace(',', '.'))

    if (!Number.isFinite(normalizedAmount) || normalizedAmount === 0) {
      setFormError('Введите корректную сумму, отличную от нуля')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/store/v2/s/wallet-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          waid: formWallet,
          amount: Math.abs(normalizedAmount),
        }),
      })

      const body = await response.json().catch(() => ({})) as { error?: string }

      if (!response.ok) {
        throw new Error(body?.error || 'Не удалось создать транзакцию')
      }

      setFormSuccess('Транзакция успешно создана')
      setAmount('')
      setFormOpen(false)
      await fetchData(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!formOpen) {
      setFormError(null)
      setFormSuccess(null)
      setAmount('')
    }
  }, [formOpen])

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
  const basePath = '/s/wallets'
  const rowOffset = (page - 1) * PAGE_SIZE

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Кошельки</h1>
          <p className="text-sm text-muted-foreground">Просматривайте баланс и пополняйте кошельки.</p>
        </div>
        <Sheet open={formOpen} onOpenChange={setFormOpen}>
          <SheetTrigger asChild>
            <Button>Добавить транзакцию</Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Новая транзакция</SheetTitle>
              <SheetDescription>
                Создайте пополнение кошелька. Статус записи будет «COMPLETED_PAYMENT».
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {formError && (
                <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="rounded-md border border-emerald-500 bg-emerald-500/10 p-3 text-sm text-emerald-600">
                  {formSuccess}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="wallet-select">Кошелёк</Label>
                <Select
                  value={formWallet}
                  onValueChange={setFormWallet}
                  disabled={submitting || walletOptions.length === 0}
                >
                  <SelectTrigger id="wallet-select">
                    <SelectValue placeholder="Выберите кошелёк" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {walletOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">Нет доступных активных кошельков для пополнения.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wallet-amount">Сумма</Label>
                <Input
                  id="wallet-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
                  Отмена
                </Button>
                <Button type="submit" disabled={submitting || walletOptions.length === 0}>
                  {submitting ? 'Создание...' : 'Добавить'}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">№</TableHead>
              <TableHead>Название</TableHead>
              <TableHead className="text-right">Баланс</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.docs.map((doc, idx) => {
              const displayIndex = rowOffset + idx + 1
              const titleText = resolveTitle(doc)

              // баланс из dataIn
              const balance = doc.dataIn?.balance !== undefined 
                ? new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 2 }).format(doc.dataIn.balance)
                : '-'

              return (
                <TableRow key={doc.id}>
                  <TableCell><Link href={`${basePath}/view?waid=${doc.waid}`}>{displayIndex}</Link></TableCell>
                  <TableCell><Link href={`${basePath}/view?waid=${doc.waid}`}>{titleText}</Link></TableCell>
                  <TableCell className="text-right">{balance}</TableCell>
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
    </div>
  )
}

