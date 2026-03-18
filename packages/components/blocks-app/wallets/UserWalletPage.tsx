'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, ArrowLeft, ArrowDownCircle, ArrowUpCircle, Plus } from 'lucide-react'
import { AdminHeader } from '@/packages/components/blocks-app/app-admin/AdminHeader'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { altrpWallet, altrpWalletTransaction } from '@/shared/types/altrp-finance'
import { altrpUser } from '@/shared/types/altrp'
import { useMe } from '@/providers/MeProvider'
import { WalletType } from '@/shared/types/altrp-finance'
import {
  Taxonomy,
} from '@/shared/schema/types'
import { formatDate } from '@/shared/utils/date-format'
export default function UserWalletPage({ 
  wallet: initialWallet,
   walletType,
    walletTypeOptions,
    userUuid,
  }:
  { wallet: altrpWallet, walletType: WalletType, walletTypeOptions: Taxonomy[], userUuid: string }) {
  const router = useRouter()
  const params = useParams()
  const haid = params.haid as string
  const human = initialWallet?.human

  const [loading, setLoading] = React.useState(true)
  const { user: meUser } = useMe()

  const [wallet, setWallet] = React.useState<altrpWallet | null>(initialWallet)
  const [transactions, setTransactions] = React.useState<altrpWalletTransaction[]>([])
  const [error, setError] = React.useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [transactionForm, setTransactionForm] = React.useState({
    amount: '',
    type: 'DEPOSIT',
    comment: '',
  })

  // Set loading to false once initial wallet data is received
  React.useEffect(() => {
    if (initialWallet) {
      setLoading(false)
    }
  }, [initialWallet])

  // Load transactions when wallet is available
  React.useEffect(() => {
    const loadTransactions = async () => {
      if (!wallet?.uuid) return

      try {
        const response = await fetch(`/api/altrp/v1/admin/wallets/${wallet.uuid}/transactions`, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch transactions')
        }

        const result = (await response.json()) as {
          success: boolean
          transactions?: altrpWalletTransaction[]
        }

        if (result.success && result.transactions) {
          setTransactions(result.transactions)
        }
      } catch (err) {
        console.error('Failed to load transactions:', err)
        // Don't show error to user, just log it
      }
    }

    loadTransactions()
  }, [wallet?.uuid])



  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!wallet) {
      setError('Wallet not found')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Используем новый endpoint для начисления средств
      // Он автоматически проверит и погасит finance при необходимости
      const response = await fetch(`/api/altrp/v1/admin/wallets/${wallet.uuid}/deposit`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(transactionForm.amount),
          type: transactionForm.type,
          description: transactionForm.comment,
          waid: wallet.waid,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error((errorData as any).message || (errorData as any).error || 'Failed to deposit funds')
      }

      const result = (await response.json()) as {
        success: boolean
        wallet?: { balance: number }
        message?: string
      }

      if (result.success) {
        // Обновляем баланс кошелька в локальном состоянии
        if (wallet && wallet.dataIn && typeof wallet.dataIn === 'object' && result.wallet) {
          const dataIn = wallet.dataIn as any
          dataIn.balance = result.wallet.balance
          if (dataIn.balanceKopecks !== undefined) {
            dataIn.balanceKopecks = Math.round(result.wallet.balance * 100)
          }
          setWallet({ ...wallet })
        }

        // Перезагружаем транзакции
        if (wallet?.uuid) {
          const transactionsResponse = await fetch(`/api/altrp/v1/admin/wallets/${wallet.uuid}/transactions`, {
            credentials: 'include',
          })
          if (transactionsResponse.ok) {
            const transactionsResult = (await transactionsResponse.json()) as {
              success: boolean
              transactions?: altrpWalletTransaction[]
            }
            if (transactionsResult.success && transactionsResult.transactions) {
              setTransactions(transactionsResult.transactions)
            }
          }
        }

        // Обновляем страницу для получения актуальных данных
        router.refresh()

        // Закрываем диалог и сбрасываем форму
        setDialogOpen(false)
        setTransactionForm({
          amount: '',
          type: 'DEPOSIT',
          comment: '',
        })
      } else {
        throw new Error(result.message || 'Failed to deposit funds')
      }
    } catch (err) {
      console.error('Failed to deposit funds:', err)
      setError(err instanceof Error ? err.message : 'Failed to deposit funds')
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
    const labels: Record<string, string> = {
      DEPOSIT: 'Пополнение',
      WITHDRAWAL: 'Вывод',
      PROFIT_PAYOUT: 'Начисление прибыли',
      DEAL_FINANCING: 'Финансирование сделки',
      DEAL_REPAYMENT: 'Возврат от сделки',
    }
    return labels[type] || type
  }

  const getTransactionTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      DEPOSIT: 'default',
      PROFIT_PAYOUT: 'default',
      DEAL_REPAYMENT: 'default',
      WITHDRAWAL: 'destructive',
      DEAL_FINANCING: 'secondary',
    }
    return variants[type] || 'outline'
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="Кошелек пользователя" />
        <main className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </>
    )
  }

  if (error && !human) {
    return (
      <>
        <AdminHeader title="Кошелек пользователя" />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button variant="outline" onClick={() => {
                if(window.history.length > 1) {
                  router.back()
                } else {
                  router.push('/m/users')
                }
              }}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Вернуться к списку пользователей
              </Button>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Кошелек пользователя" />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => {
                if(window.history.length > 1) {
                  router.back()
                } else {
                  router.push(`/m/users/${userUuid}`)
                }
              }}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад к профилю
              </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* User Info */}
          {human && (
            <Card>
              <CardHeader>
                <CardTitle>Информация о пользователе</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Email:</span> {human.email}
                  </div>
                  {human?.fullName && (
                    <div>
                      <span className="font-medium">ФИО:</span> {human.fullName}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Human AID:</span>{' '}
                    <code className="text-xs">{human.haid || '-'}</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wallet Info */}
          {wallet ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <CardTitle>Кошелек ({walletTypeOptions.find(tax => tax.name === walletType)?.title})</CardTitle>
                      {walletTypeOptions.length && (
                        <Select
                          value={walletType}
                          onValueChange={(value) => {
                            window.location.href = `/m/users/${haid}/wallet?type=${value}`
                          }}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {walletTypeOptions.map((option) => (
                              <SelectItem key={option.name} value={option.name}>
                                {option.title || option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <CardDescription>ID: {wallet.waid}</CardDescription>
                  </div>

                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Начислить средства
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleCreateTransaction}>
                        <DialogHeader>
                          <DialogTitle>Начислить средства на кошелек</DialogTitle>
                          <DialogDescription>
                            Начислите средства на кошелек пользователя. Система автоматически проверит и погасит просроченные платежи, если баланс достаточен. Обязательно укажите причину операции.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="amount">
                              Сумма <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="amount"
                              type="number"
                              step="0.01"
                              required
                              value={transactionForm.amount}
                              onChange={(e) =>
                                setTransactionForm((prev) => ({ ...prev, amount: e.target.value }))
                              }
                              placeholder="10000"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="type">
                              Тип операции <span className="text-destructive">*</span>
                            </Label>
                            <Select
                              value={transactionForm.type}
                              onValueChange={(value) =>
                                setTransactionForm((prev) => ({ ...prev, type: value }))
                              }>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DEPOSIT">Пополнение</SelectItem>
                                <SelectItem value="WITHDRAWAL">Вывод средств</SelectItem>
                                <SelectItem value="PROFIT_PAYOUT">Начисление прибыли</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="comment">
                              Комментарий <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                              id="comment"
                              required
                              rows={4}
                              value={transactionForm.comment}
                              onChange={(e) =>
                                setTransactionForm((prev) => ({ ...prev, comment: e.target.value }))
                              }
                              placeholder="Например: Внесение наличных средств потребителем Ивановым И.И. в офисе г. Казань, принял менеджер Петров А.А."
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            disabled={submitting}>
                            Отмена
                          </Button>
                          <Button type="submit" disabled={submitting}>
                            {submitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Начисление...
                              </>
                            ) : (
                              'Начислить'
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Текущий баланс</div>
                    <div className="text-3xl font-bold">{formatCurrency(wallet.dataIn?.balance || 0)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Валюта:</span> {wallet.dataIn?.currency}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Создан:</span> {formatDate(wallet.createdAt)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  У пользователя еще нет кошелька. Кошелек будет создан автоматически при первой транзакции.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Transactions */}
          {wallet && (
            <Card>
              <CardHeader>
                <CardTitle>История транзакций</CardTitle>
                <CardDescription>Все движения средств по кошельку</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
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
                        <TableRow key={tx.uuid}>
                          <TableCell className="text-muted-foreground">
                            {formatDate(tx.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getTransactionTypeBadge(tx.dataIn?.type || '')}>
                              {getTransactionTypeLabel(tx.dataIn?.type || '')}
                            </Badge>
                          </TableCell>
                          <TableCell className={Number(tx.amount) > 0 ? 'text-green-600' : 'text-red-600'}>
                            {Number(tx.amount) > 0 ? '+' : ''}
                            {formatCurrency(Number(tx.amount) / 100)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{tx.dataIn?.description || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={tx.statusName === 'COMPLETED' ? 'default' : 'secondary'}>
                              {tx.statusName}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Транзакций пока нет
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  )
}

