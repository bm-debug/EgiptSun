"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"

export default function TesterDashboardPage() {
  const [stats, setStats] = React.useState({
    activeTasks: 0,
    pendingReview: 0,
    balance: 0,
  })
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const [tasksRes, walletRes] = await Promise.all([
          fetch("/api/altrp/v1/t/my-tasks?limit=100", { credentials: "include" }),
          fetch("/api/altrp/v1/t/wallet", { credentials: "include" }),
        ])
        let activeTasks = 0
        let pendingReview = 0
        if (tasksRes.ok) {
          const tasksJson = (await tasksRes.json()) as { data?: any[] }
          const tasks = tasksJson.data || []
          activeTasks = tasks.filter((t: any) => t.statusName === "in_progress").length
          pendingReview = tasks.filter((t: any) => t.statusName === "pending_review").length
        }
        let balance = 0
        if (walletRes.ok) {
          const walletJson = (await walletRes.json()) as { data?: { balance?: number } }
          balance = walletJson.data?.balance ?? 0
        }
        setStats({ activeTasks, pendingReview, balance })
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные задания</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTasks}</div>
            <p className="text-xs text-muted-foreground">В работе</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ожидают проверки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReview}</div>
            <p className="text-xs text-muted-foreground">Отчёты на модерации</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Баланс баллов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.balance}</div>
            <p className="text-xs text-muted-foreground">Доступно для вывода</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Уровень профиля</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <Progress value={0} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">Новичок</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Добро пожаловать в Tester Portal</CardTitle>
          <CardDescription>
            Выберите задание из каталога, выполните тестирование и отправьте отчёт. За одобренные отчёты начисляются баллы.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Используйте боковое меню для навигации между Заданиями, Кошельком и другими разделами.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
