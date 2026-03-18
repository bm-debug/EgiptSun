'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { altrpJournal } from '@/shared/types/altrp'
import { formatDate } from '@/shared/utils/date-format'

interface EventDetailPageComponentProps {
  journal: altrpJournal
}

export default function EventDetailPageComponent({ journal }: EventDetailPageComponentProps) {
 

  const parseDetails = () => {
    if (!journal.details) return null
    try {
      return typeof journal.details === 'string'
        ? JSON.parse(journal.details)
        : journal.details
    } catch {
      return journal.details
    }
  }

  const details = parseDetails()
  // parseJournals already transforms action to readable name, so use it directly
  const actionName = journal.action || 'Неизвестное событие'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/m/events">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Детали события</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Тип события</label>
              <div className="mt-1">
                <Badge variant="default">{actionName}</Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">UUID</label>
              <div className="mt-1 font-mono text-sm">{journal.uuid}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Дата создания</label>
              <div className="mt-1">{formatDate(journal.createdAt)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Дата обновления</label>
              <div className="mt-1">{formatDate(journal.updatedAt)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {details && (
        <Card>
          <CardHeader>
            <CardTitle>Детали события</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4">
              <pre className="text-sm overflow-auto whitespace-pre-wrap">
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Link href="/m/events">
          <Button variant="outline">Вернуться к списку событий</Button>
        </Link>
      </div>
    </div>
  )
}

