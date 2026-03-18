'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

interface Transaction {
  id: string
  type: 'deposit' | 'withdrawal' | 'investment' | 'return'
  amount: number
  comment?: string
  date: string
  status: string
}

export default function InvestorWalletPage() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [depositDialogOpen, setDepositDialogOpen] = React.useState(false)
  const [withdrawDialogOpen, setWithdrawDialogOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [depositForm, setDepositForm] = React.useState({ amount: '', comment: '' })
  const [withdrawForm, setWithdrawForm] = React.useState({ amount: '', comment: '' })

  React.useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/altrp/v1/i/wallet/transactions', {
          credentials: 'include',
        })

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            message?: string
            error?: string
          }
          throw new Error(errorData.message || errorData.error || 'Failed to load transactions')
        }

        const data = await response.json() as { success: boolean; transactions?: Transaction[] }
        
        if (data.success && data.transactions) {
          setTransactions(data.transactions)
        } else {
          setTransactions([])
        }
      } catch (err) {
        console.error('Transactions fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load transactions')
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      // TODO: Implement deposit API
      setDepositDialogOpen(false)
      setDepositForm({ amount: '', comment: '' })
    } catch (err) {
      console.error('Deposit error:', err)
      setError(err instanceof Error ? err.message : 'Failed to deposit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      // TODO: Implement withdrawal API
      setWithdrawDialogOpen(false)
      setWithdrawForm({ amount: '', comment: '' })
    } catch (err) {
      console.error('Withdrawal error:', err)
      setError(err instanceof Error ? err.message : 'Failed to withdraw')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Пополнение'
      case 'withdrawal':
        return 'Вывод'
      case 'investment':
        return 'Инвестиция'
      case 'return':
        return 'Возврат'
      default:
        return type
    }
  }

  const getTransactionTypeVariant = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'return':
        return 'default'
      case 'withdrawal':
        return 'secondary'
      case 'investment':
        return 'outline'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Мой кошелек</h1>
        <div className="flex gap-2">
          <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <ArrowDownCircle className="mr-2 h-4 w-4" />
                Пополнить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Пополнить кошелек</DialogTitle>
                <DialogDescription>
                  Введите сумму для пополнения
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleDeposit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="depositAmount">Сумма *</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    value={depositForm.amount}
                    onChange={(e) =>
                      setDepositForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="0"
                    required
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depositComment">Комментарий</Label>
                  <Textarea
                    id="depositComment"
                    value={depositForm.comment}
                    onChange={(e) =>
                      setDepositForm((prev) => ({ ...prev, comment: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDepositDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Обработка...
                      </>
                    ) : (
                      'Пополнить'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ArrowUpCircle className="mr-2 h-4 w-4" />
                Вывести
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Вывести средства</DialogTitle>
                <DialogDescription>
                  Введите сумму для вывода
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="withdrawAmount">Сумма *</Label>
                  <Input
                    id="withdrawAmount"
                    type="number"
                    value={withdrawForm.amount}
                    onChange={(e) =>
                      setWithdrawForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="0"
                    required
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withdrawComment">Комментарий</Label>
                  <Textarea
                    id="withdrawComment"
                    value={withdrawForm.comment}
                    onChange={(e) =>
                      setWithdrawForm((prev) => ({ ...prev, comment: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWithdrawDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Обработка...
                      </>
                    ) : (
                      'Вывести'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>История транзакций</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              Нет транзакций
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTransactionTypeVariant(tx.type)}>
                        {getTransactionTypeLabel(tx.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className={tx.amount > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {tx.amount > 0 ? '+' : ''}
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {tx.comment || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tx.status === 'completed' || tx.status === 'COMPLETED'
                            ? 'default'
                            : tx.status === 'pending' || tx.status === 'PENDING'
                              ? 'secondary'
                              : 'destructive'
                        }>
                        {tx.status === 'completed' || tx.status === 'COMPLETED'
                          ? 'Завершено'
                          : tx.status === 'pending' || tx.status === 'PENDING'
                            ? 'В обработке'
                            : tx.status === 'failed' || tx.status === 'FAILED'
                              ? 'Ошибка'
                              : tx.status === 'cancelled' || tx.status === 'CANCELLED'
                                ? 'Отменена'
                                : tx.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

