"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface Transaction {
  id: string
  type: "reward" | "withdrawal" | "other"
  amount: number
  comment: string
  date: string
  status: string
}

export default function TesterWalletPage() {
  const [balance, setBalance] = React.useState(0)
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchWallet = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch("/api/altrp/v1/t/wallet", { credentials: "include" })
        if (!res.ok) throw new Error("Failed to load wallet")
        const json = (await res.json()) as {
          success?: boolean
          data?: { balance?: number; transactions?: Transaction[] }
        }
        if (json.success && json.data) {
          setBalance(json.data.balance ?? 0)
          setTransactions(json.data.transactions ?? [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки")
      } finally {
        setLoading(false)
      }
    }
    fetchWallet()
  }, [])

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "reward":
        return "Награда"
      case "withdrawal":
        return "Вывод"
      default:
        return "Операция"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Кошелёк баллов</h1>
        <p className="text-muted-foreground mt-1">Баланс и история начислений</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Текущий баланс</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{balance} баллов</div>
          <p className="text-xs text-muted-foreground mt-1">Вывод баллов будет доступен в следующих версиях</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>История начислений</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Нет транзакций</p>
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
                      {tx.date
                        ? new Date(tx.date).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.type === "reward" ? "default" : "secondary"}>{getTypeLabel(tx.type)}</Badge>
                    </TableCell>
                    <TableCell className={tx.amount > 0 ? "text-green-600 font-medium" : "font-medium"}>
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount} баллов
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">{tx.comment || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={tx.status === "completed" ? "default" : "secondary"}>
                        {tx.status === "completed" ? "Завершено" : tx.status}
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
