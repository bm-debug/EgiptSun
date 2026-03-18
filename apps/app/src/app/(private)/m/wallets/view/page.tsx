'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

type WalletResponse = {
  wallet: {
    id: number
    uuid: string | null
    title: unknown
    waid: string | null
    targetAid: string | null
    statusName: string | null
    createdAt: string | null
    updatedAt: string | null
    dataIn: Record<string, unknown>
    balance: number
    currencies: Record<string, number>
  }
  transactions: Array<{
    id: number
    uuid: string | null
    wcaid: string
    fullWaid: string | null
    targetAid: string | null
    amount: number
    amountFormatted: string
    statusName: string | null
    createdAt: string | null
    createdAtFormatted: string
    dataIn: Record<string, unknown>
  }>
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 2 }).format(value)

const formatDate = (iso: string | null, fallback?: string) => {
  if (iso) {
    try {
      return new Intl.DateTimeFormat('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso))
    } catch {
      return fallback || iso
    }
  }
  return fallback ?? '—'
}

const resolveTitle = (title: unknown): string => {
  if (!title) {
    return '-'
  }

  if (typeof title === 'string') {
    return title
  }

  if (typeof title === 'object' && title !== null) {
    const maybeRecord = title as Record<string, unknown>
    if (typeof maybeRecord.ru === 'string') {
      return maybeRecord.ru
    }
    if (typeof maybeRecord.en === 'string') {
      return maybeRecord.en
    }
  }

  return '-'
}

export default function Page() {
  const searchParams = useSearchParams()
  const waid = searchParams.get('waid')

  const [data, setData] = useState<WalletResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!waid) {
      setError('Не указан параметр waid')
      setLoading(false)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/store/v2/m/wallets/view?waid=${encodeURIComponent(waid)}`, {
          credentials: 'include',
        })

        const body = await response.json() as any

        if (!response.ok) {
          throw new Error(body?.error || 'Не удалось получить данные кошелька')
        }

        setData(body as WalletResponse)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [waid])

  const currencyChips = useMemo(() => {
    if (!data?.wallet?.currencies) {
      return [] as Array<{ currency: string; amount: number }>
    }

    return Object.entries(data.wallet.currencies).map(([currency, amount]) => ({ currency, amount }))
  }, [data?.wallet?.currencies])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Ошибка: {error}
        </div>
        <Link href="/m/wallets">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Button>
        </Link>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { wallet, transactions } = data

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{resolveTitle(wallet.title)}</h1>
          <p className="text-sm text-muted-foreground">Кошелёк {wallet.waid || '—'}</p>
        </div>
        <Link href="/m/wallets">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Баланс</div>
          <div className="text-2xl font-semibold">{formatCurrency(wallet.balance ?? 0)}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Target AID</div>
          <div className="text-lg font-medium">{wallet.targetAid || '—'}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Статус</div>
          <div className="text-lg font-medium">{wallet.statusName || '—'}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="text-sm text-muted-foreground">Создан</div>
          <div>{formatDate(wallet.createdAt)}</div>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="text-sm text-muted-foreground">Обновлён</div>
          <div>{formatDate(wallet.updatedAt)}</div>
        </div>
      </div>

      {currencyChips.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium">Счета по валютам</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {currencyChips.map(({ currency, amount }) => (
              <span key={currency} className="rounded-full bg-muted px-3 py-1 text-sm">
                {currency}: {new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 2 }).format(amount)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Транзакции</h2>
          <p className="text-sm text-muted-foreground">Список последних операций по кошельку</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>WCAID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  Транзакции отсутствуют
                </TableCell>
              </TableRow>
            )}
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.createdAtFormatted || formatDate(transaction.createdAt)}</TableCell>
                <TableCell>{transaction.amountFormatted}</TableCell>
                <TableCell>{transaction.statusName || '—'}</TableCell>
                <TableCell>{transaction.wcaid}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
