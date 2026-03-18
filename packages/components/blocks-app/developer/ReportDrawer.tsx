"use client"

import * as React from "react"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/packages/components/ui/revola"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X, AlertCircle } from "lucide-react"
import Image from "next/image"

interface ReportDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: any | null
}

export function ReportDrawer({ open, onOpenChange, report }: ReportDrawerProps) {
  const [loading, setLoading] = React.useState(false)

  const handleApprove = async () => {
    if (!report?.id) return
    setLoading(true)
    try {
      const response = await fetch(`/api/altrp/v1/d/reports/${report.id}/approve`, {
        method: "POST",
        credentials: "include",
      })
      if (response.ok) {
        onOpenChange(false)
        // Refresh reports list
        window.location.reload()
      }
    } catch (error) {
      console.error("Failed to approve report:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!report?.id) return
    setLoading(true)
    try {
      const response = await fetch(`/api/altrp/v1/d/reports/${report.id}/reject`, {
        method: "POST",
        credentials: "include",
      })
      if (response.ok) {
        onOpenChange(false)
        // Refresh reports list
        window.location.reload()
      }
    } catch (error) {
      console.error("Failed to reject report:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!report) return null

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
            <ResponsiveDialogTitle>Детали отчета</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Просмотрите отчет тестера и одобрите или отклоните его
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
          {/* Report Status */}
          <div className="flex items-center justify-between">
            <Badge variant={report.status === "approved" ? "default" : report.status === "rejected" ? "destructive" : "secondary"}>
              {report.status === "approved" ? "одобрен" : report.status === "rejected" ? "отклонен" : "ожидает"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Отправлен: {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "—"}
            </span>
          </div>

          {/* Tester Info */}
          {report.testerName && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Тестер</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{report.testerName}</p>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {report.attachments && report.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Вложения</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {report.attachments.map((attachment: string, index: number) => (
                    <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={attachment}
                        alt={`Вложение ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Answers */}
          {report.answers && Object.keys(report.answers).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ответы</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(report.answers).map(([question, answer]: [string, any]) => (
                  <div key={question}>
                    <p className="text-sm font-medium mb-1">{question}</p>
                    <p className="text-sm text-muted-foreground">
                      {typeof answer === "object" ? JSON.stringify(answer) : String(answer)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {report.status === "pending" && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={loading}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Отклонить
              </Button>
              <Button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Одобрить
              </Button>
            </div>
          )}
            </div>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
