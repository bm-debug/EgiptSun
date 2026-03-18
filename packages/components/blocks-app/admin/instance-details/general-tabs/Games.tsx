"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit, Plus } from "lucide-react"
import Image from "next/image"
import { parseJson } from "@/shared/utils/json"
import type { Product } from "@/shared/schema"

interface GamesProps {
  game: Product
}

export function Games({ game }: GamesProps) {
  const router = useRouter()
  const [campaigns, setCampaigns] = React.useState<any[]>([])
  const [campaignsLoading, setCampaignsLoading] = React.useState(false)

  const gameId = game.paid

  // Fetch campaigns for this game
  React.useEffect(() => {
    const fetchCampaigns = async () => {
      if (!game?.paid) return
      try {
        setCampaignsLoading(true)
        // TODO: Fetch campaigns from goals collection filtered by gameId
        // For now, empty array
        setCampaigns([])
      } catch (err) {
        console.error("Failed to fetch campaigns:", err)
      } finally {
        setCampaignsLoading(false)
      }
    }

    fetchCampaigns()
  }, [game?.paid])

  const dataIn = parseJson<{
    owner?: string
    genre?: string
    coverImage?: string
    builds?: Array<{ name: string; url: string }>
    description?: string
  }>(game.dataIn || "", {})

  const gameTitle = typeof game.title === "string" ? game.title : JSON.parse(game.title || '""')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-6">
        {dataIn.coverImage && (
          <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <Image
              src={dataIn.coverImage}
              alt={gameTitle}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="flex-1">
          {dataIn.genre && (
            <p className="text-muted-foreground mt-1">Жанр: {dataIn.genre}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/d/games/${gameId}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Редактировать
          </Button>
          <Button onClick={() => router.push(`/d/games/${gameId}/campaigns/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Новая кампания
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Сводка</TabsTrigger>
          <TabsTrigger value="campaigns">Кампании</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего потрачено</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">По всем кампаниям</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Найдено багов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Всего отчетов одобрено</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Активные кампании</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.filter((c) => c.status === "active").length}
                </div>
                <p className="text-xs text-muted-foreground">Сейчас запущено</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Кампании</h2>
            <Button onClick={() => router.push(`/d/games/${gameId}/campaigns/new`)}>
              <Plus className="h-4 w-4 mr-2" />
              Новая кампания
            </Button>
          </div>
          {campaignsLoading ? (
            <div className="text-muted-foreground">Загрузка кампаний...</div>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground mb-4">Пока нет кампаний</p>
                <Button onClick={() => router.push(`/d/games/${gameId}/campaigns/new`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать первую кампанию
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <Card key={campaign.gaid}>
                  <CardHeader>
                    <CardTitle>{campaign.title}</CardTitle>
                    <CardDescription>Статус: {campaign.status}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Настройки игры</CardTitle>
              <CardDescription>Управление деталями игры и билдами</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Описание</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {dataIn.description || "Описание не задано"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Билды</label>
                {dataIn.builds && dataIn.builds.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {dataIn.builds.map((build, index) => (
                      <li key={index} className="text-sm">
                        <a href={build.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {build.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Билды не добавлены</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
