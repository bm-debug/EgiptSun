"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Gamepad2 } from "lucide-react"
import Image from "next/image"

interface GameItem {
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

interface GamesListProps {
  games: GameItem[]
  loading?: boolean
  error?: string | null
}

export function GamesList({ games, loading, error }: GamesListProps) {
  const router = useRouter()

  const handleStartTask = (gaid: string) => {
    router.push(`/login?redirect=/t/tasks/${gaid}`)
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

  if (games.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Gamepad2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">Пока нет доступных игр для тестирования</p>
          <p className="text-sm text-muted-foreground mt-1">Игры появятся, когда разработчики запустят кампании</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {games.map((task) => {
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
                Начать тестирование
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
