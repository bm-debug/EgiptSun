"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/packages/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/packages/components/ui/revola"
import { useMe } from "@/providers/MeProvider"

interface GameFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GameFormDialog({ open, onOpenChange }: GameFormDialogProps) {
  const router = useRouter()
  const { user } = useMe()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState({
    title: "",
    genre: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!user?.humanAid) {
        throw new Error("Пользователь не аутентифицирован")
      }

      const response = await fetch("/api/altrp/v1/d/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: formData.title,
          data_in: {
            owner: user.humanAid,
            genre: formData.genre,
          },
        }),
      })

      if (!response.ok) {
        let errorData: any = {}
        let responseText = ""
        
        try {
          // Always read response as text first
          responseText = await response.text()
          console.log("[GameFormDialog] Raw response text:", responseText)
          
          if (responseText) {
            try {
              errorData = JSON.parse(responseText)
              console.log("[GameFormDialog] Parsed error data:", errorData)
            } catch (parseError) {
              // If not JSON, use text as message
              console.log("[GameFormDialog] Response is not JSON, using as text message")
              errorData = { message: responseText }
            }
          } else {
            console.log("[GameFormDialog] Response text is empty")
            errorData = {
              error: `HTTP_${response.status}`,
              message: `Не удалось создать игру (${response.status} ${response.statusText})`
            }
          }
        } catch (e) {
          console.error("[GameFormDialog] Failed to read response:", e)
          errorData = {
            error: `HTTP_${response.status}`,
            message: `Не удалось создать игру (${response.status} ${response.statusText})`
          }
        }
        
        // If errorData is still empty, create a meaningful error message
        if (!errorData || Object.keys(errorData).length === 0) {
          console.warn("[GameFormDialog] Error data is empty, creating default error")
          errorData = {
            error: `HTTP_${response.status}`,
            message: responseText || `Не удалось создать игру (${response.status} ${response.statusText})`
          }
        }
        
        console.error("[GameFormDialog] API error:", {
          status: response.status,
          statusText: response.statusText,
          responseText: responseText || "(empty)",
          errorData,
          headers: Object.fromEntries(response.headers.entries()),
          url: response.url,
        })
        
        // Determine error message
        let errorMessage = errorData.message || errorData.error || `Не удалось создать игру (${response.status})`
        
        // Map common error codes to user-friendly messages
        if (errorData.error === "UNAUTHORIZED" || response.status === 401) {
          errorMessage = "Вы не авторизованы. Пожалуйста, войдите в систему."
        } else if (errorData.error === "FORBIDDEN" || response.status === 403) {
          errorMessage = "У вас нет прав для создания игр. Требуется роль разработчика."
        } else if (errorData.error === "USER_HAS_NO_HUMAN_PROFILE") {
          errorMessage = "Профиль пользователя не найден. Обратитесь в поддержку."
        } else if (errorData.error === "TITLE_REQUIRED") {
          errorMessage = "Название игры обязательно."
        } else if (response.status === 403) {
          errorMessage = "У вас нет прав для создания игр. Убедитесь, что у вас есть роль 'developer'."
        } else if (response.status === 400) {
          errorMessage = errorData.message || "Неверные данные запроса. Проверьте введенные данные."
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json() as any
      onOpenChange(false)
      setFormData({ title: "", genre: "" })
      
      // Navigate to game detail page
      if (result.data?.paid) {
        router.push(`/d/games/${result.data.paid}`)
      } else {
        router.push("/d/games")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать игру")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveDialog 
      open={open} 
      onOpenChange={onOpenChange}
      onlyDrawer
      direction="right"
      handleOnly
    >
      <ResponsiveDialogContent className="h-[calc(100svh-16px)] w-[560px] max-w-[95vw] overflow-hidden p-0">
        <div className="flex h-full flex-col">
          <ResponsiveDialogHeader className="px-6 pt-6">
            <ResponsiveDialogTitle>Добавить игру</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Создайте новую игру для запуска тестовых кампаний.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Название игры</Label>
              <Input
                id="title"
                placeholder="Введите название игры"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="genre">Жанр</Label>
              <Input
                id="genre"
                placeholder="например, Action, RPG, Strategy"
                value={formData.genre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, genre: e.target.value }))
                }
              />
            </div>
                {error && (
                  <div className="text-sm text-destructive">{error}</div>
                )}
              </div>
            </div>
            <ResponsiveDialogFooter className="px-6 pb-6 border-t">
              <ResponsiveDialogClose asChild>
                <Button type="button" variant="outline">
                  Отмена
                </Button>
              </ResponsiveDialogClose>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-primary hover:bg-primary/90 !text-[oklch(0.1410_0.0050_285.8230)]"
              >
                {loading ? "Создание..." : "Создать игру"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
