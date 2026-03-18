"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import Image from "next/image"
import { ReportForm } from "@/components/blocks-app/tester/ReportForm"

interface CampaignData {
  campaign: any
  game: any
  rewardPoints: number
  description: string
  instructions: string
  questionnaire: Array<{ id: string; type: string; label: string; options?: string[] }>
  build?: string
  platform?: string
  coverImage?: string
  myExecution: {
    gaid: string
    fullGaid: string
    statusName: string
    dataOut: any
  } | null
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const gaid = params.gaid as string
  const [data, setData] = React.useState<CampaignData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [starting, setStarting] = React.useState(false)

  const fetchTask = React.useCallback(async () => {
    if (!gaid) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/altrp/v1/t/tasks/${gaid}`, { credentials: "include" })
      if (!res.ok) {
        if (res.status === 404) throw new Error("Задание не найдено")
        throw new Error("Ошибка загрузки")
      }
      const json = (await res.json()) as { success?: boolean; data?: CampaignData; message?: string }
      if (json.success && json.data) {
        setData(json.data)
      } else {
        setError("Данные не получены")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [gaid])

  React.useEffect(() => {
    fetchTask()
  }, [fetchTask])

  const handleStartTask = async () => {
    if (!gaid) return
    setStarting(true)
    try {
      const res = await fetch(`/api/altrp/v1/t/tasks/${gaid}/start`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const json = (await res.json()) as { success?: boolean; message?: string }
      if (json.success) {
        await fetchTask()
      } else {
        setError(json.message || "Не удалось начать задание")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка")
    } finally {
      setStarting(false)
    }
  }

  const handleReportSubmitted = () => {
    fetchTask()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error || "Задание не найдено"}</p>
        <Button variant="outline" className="mt-2" onClick={() => router.push("/t/tasks")}>
          Назад к заданиям
        </Button>
      </div>
    )
  }

  const gameTitle =
    typeof data.game?.title === "string"
      ? data.game.title
      : (() => {
          try {
            return JSON.parse(data.game?.title || '""') || "Игра"
          } catch {
            return "Игра"
          }
        })()

  const campaignTitle = typeof data.campaign?.title === "string"
    ? data.campaign.title
    : (() => {
        try {
          return JSON.parse(data.campaign?.title || '""') || "Задание"
        } catch {
          return "Задание"
        }
      })()

  const hasStarted = !!data.myExecution
  const status = data.myExecution?.statusName
  const canSubmitReport = hasStarted && (status === "in_progress" || !status)
  const isPendingReview = status === "pending_review"
  const isApproved = status === "approved"
  const isRejected = status === "rejected"

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          {data.coverImage && (
            <div className="relative w-full md:w-64 h-40 md:h-48 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              <Image src={data.coverImage} alt={gameTitle} fill className="object-cover" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{gameTitle}</h1>
            <p className="text-muted-foreground mt-1">{campaignTitle}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge>{data.rewardPoints} баллов</Badge>
              {data.platform && <Badge variant="secondary">{data.platform}</Badge>}
              {hasStarted && (
                <Badge
                  variant={
                    isApproved ? "default" : isRejected ? "destructive" : isPendingReview ? "secondary" : "outline"
                  }
                >
                  {isApproved ? "Одобрено" : isRejected ? "Отклонено" : isPendingReview ? "На проверке" : "В работе"}
                </Badge>
              )}
            </div>
            {!hasStarted && (
              <Button className="mt-4" onClick={handleStartTask} disabled={starting}>
                {starting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  "Начать тест"
                )}
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="description" className="w-full">
          <TabsList>
            <TabsTrigger value="description">Описание</TabsTrigger>
            <TabsTrigger value="instructions">Инструкция</TabsTrigger>
            {hasStarted && <TabsTrigger value="report">Отчёт</TabsTrigger>}
          </TabsList>
          <TabsContent value="description" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Описание</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{data.description || "Описание не указано"}</p>
                {data.build && (
                  <a
                    href={data.build}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline block mt-2"
                  >
                    Скачать билд
                  </a>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="instructions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Инструкция</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{data.instructions || "Инструкции не указаны"}</p>
              </CardContent>
            </Card>
          </TabsContent>
          {hasStarted && (
            <TabsContent value="report" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Отправить отчёт</CardTitle>
                  <CardDescription>
                    {canSubmitReport
                      ? "Заполните форму и приложите скриншот"
                      : isPendingReview
                        ? "Ваш отчёт ожидает проверки разработчиком"
                        : isApproved
                          ? "Отчёт одобрен, баллы начислены"
                          : "Отчёт отклонён"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {canSubmitReport && data.myExecution && (
                    <ReportForm
                      executionGaid={data.myExecution.gaid}
                      campaignGaid={gaid}
                      questionnaire={data.questionnaire}
                      onSubmitted={handleReportSubmitted}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
    </div>
  )
}
