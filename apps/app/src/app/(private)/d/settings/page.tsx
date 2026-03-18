"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/packages/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useMe } from "@/providers/MeProvider"

export default function SettingsPage() {
  const { user } = useMe()
  const [loading, setLoading] = React.useState(false)
  const [formData, setFormData] = React.useState({
    studioName: "",
    contactEmail: user?.email || "",
    contactPhone: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // TODO: Implement settings update API
      await new Promise((resolve) => setTimeout(resolve, 1000))
      alert("Настройки успешно сохранены")
    } catch (error) {
      console.error("Не удалось сохранить настройки:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Настройки студии</h1>
        <p className="text-muted-foreground">Управление настройками вашей студии</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Информация о студии</CardTitle>
            <CardDescription>Основная информация о вашей студии разработки игр</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="studioName">Название студии</Label>
              <Input
                id="studioName"
                value={formData.studioName}
                onChange={(e) => setFormData((prev) => ({ ...prev, studioName: e.target.value }))}
                placeholder="Введите название студии"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactEmail">Контактный email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="contact@studio.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactPhone">Контактный телефон</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Уведомления</CardTitle>
            <CardDescription>Управление настройками уведомлений</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Настройки уведомлений будут доступны в ближайшее время</p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Сохранение..." : "Сохранить настройки"}
          </Button>
        </div>
      </form>
    </div>
  )
}
