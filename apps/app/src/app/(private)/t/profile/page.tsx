"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useMe } from "@/providers/MeProvider"

export default function TesterProfilePage() {
  const { user } = useMe()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Профиль</h1>
        <p className="text-muted-foreground mt-1">Настройки профиля тестировщика</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Основные данные</CardTitle>
          <CardDescription>Имя и контакты</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <span className="font-medium">Имя:</span> {user?.name || "—"}
          </p>
          <p className="text-sm">
            <span className="font-medium">Email:</span> {user?.email || "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Устройства и жанры</CardTitle>
          <CardDescription>Редактирование будет доступно в следующих версиях</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Укажите ваши устройства (PC, iPhone, Android) и любимые жанры игр для персонализации каталога заданий.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
