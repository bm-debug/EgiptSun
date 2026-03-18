"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Gamepad2 } from "lucide-react"
import Image from "next/image"

interface TaskItem {
  gaid: string
  fullGaid: string
  title: string | null
  statusName: string | null
  game: any
  rewardPoints: number
  platform: string
  genres: string[]
  coverImage?: string
}

export default function TesterTasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = React.useState<TaskItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch("/api/altrp/v1/t/tasks", { credentials: "include" })
        if (!res.ok) {
          throw new Error("Failed to load tasks")
        }
        const json = (await res.json()) as { success?: boolean; data?: TaskItem[] }
        if (json.success && json.data) {
          setTasks(json.data)
        } else {
          setTasks([])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки")
        setTasks([])
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [])

  const handleStartTask = (gaid: string) => {
    router.push(`/t/tasks/${gaid}`)
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
        <h1 className="text-3xl font-bold">Доступные задания</h1>
        <p className="text-muted-foreground mt-1">
          Выберите задание, выполните тестирование и получите баллы за отчёт
        </p>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Gamepad2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">Пока нет доступных заданий</p>
            <p className="text-sm text-muted-foreground mt-1">Задания появятся, когда разработчики запустят кампании</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => {
            const gameTitle = typeof task.game?.title === "string"
              ? task.game.title
              : (() => {
                  try {
                    return JSON.parse(task.game?.title || '""') || "Игра"
                  } catch {
                    return "Игра"
                  }
                })()
            return (
              <Card key={task.gaid} className="overflow-hidden">
                {task.coverImage && (
                  <div className="relative h-32 w-full bg-muted">
                    <Image
                      src={task.coverImage}
                      alt={gameTitle}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-2 text-lg">{gameTitle}</CardTitle>
                  <CardDescription className="line-clamp-2">{task.title || "Тестовое задание"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{task.platform}</Badge>
                    {task.genres.slice(0, 2).map((g) => (
                      <Badge key={g} variant="outline">
                        {g}
                      </Badge>
                    ))}
                    <Badge>{task.rewardPoints} баллов</Badge>
                  </div>
                  <Button className="w-full" onClick={() => handleStartTask(task.gaid)}>
                    Начать
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
