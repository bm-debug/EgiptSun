"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

interface QuestionnaireItem {
  id: string
  type: string
  label: string
  options?: string[]
}

interface ReportFormProps {
  executionGaid: string
  campaignGaid: string
  questionnaire: QuestionnaireItem[]
  onSubmitted: () => void
}

export function ReportForm({ campaignGaid, questionnaire, onSubmitted }: ReportFormProps) {
  const [formData, setFormData] = React.useState<Record<string, string | number>>({})
  const [comment, setComment] = React.useState("")
  const [screenshotFile, setScreenshotFile] = React.useState<File | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleChange = (id: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      let screenshotUrl = ""
      if (screenshotFile) {
        const formDataUpload = new FormData()
        formDataUpload.append("file", screenshotFile)
        const uploadRes = await fetch("/api/altrp/v1/t/upload", {
          method: "POST",
          credentials: "include",
          body: formDataUpload,
        })
        if (uploadRes.ok) {
          const uploadJson = (await uploadRes.json()) as { url?: string; data?: { url?: string } }
          screenshotUrl = uploadJson.url || uploadJson.data?.url || ""
        }
      }

      const dataOut = {
        ...formData,
        comment,
        ...(screenshotUrl && { screenshotUrl }),
      }

      const res = await fetch(`/api/altrp/v1/t/tasks/${campaignGaid}/report`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataOut, screenshotUrl }),
      })

      const json = (await res.json()) as { success?: boolean; message?: string }
      if (json.success) {
        setComment("")
        setFormData({})
        setScreenshotFile(null)
        onSubmitted()
      } else {
        setError(json.message || "Ошибка отправки")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {questionnaire.map((q) => (
        <div key={q.id} className="space-y-2">
          <Label htmlFor={q.id}>{q.label}</Label>
          {q.type === "rate" || q.type === "star_rating" ? (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].slice(0, q.type === "star_rating" ? 5 : 10).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleChange(q.id, n)}
                  className={`w-8 h-8 rounded border text-sm font-medium ${
                    formData[q.id] === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted hover:bg-muted/80 border-input"
                  }`}
                >
                  {q.type === "star_rating" ? "★" : n}
                </button>
              ))}
            </div>
          ) : q.type === "single_choice" && q.options ? (
            <select
              id={q.id}
              value={String(formData[q.id] ?? "")}
              onChange={(e) => handleChange(q.id, e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">Выберите...</option>
              {q.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <Textarea
              id={q.id}
              value={String(formData[q.id] ?? "")}
              onChange={(e) => handleChange(q.id, e.target.value)}
              placeholder={q.label}
              rows={3}
              className="resize-none"
            />
          )}
        </div>
      ))}

      <div className="space-y-2">
        <Label htmlFor="comment">Комментарий / Описание бага</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Опишите найденные проблемы или оставьте отзыв..."
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="screenshot">Скриншот (доказательство)</Label>
        <Input
          id="screenshot"
          type="file"
          accept="image/*"
          onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Отправка...
          </>
        ) : (
          "Отправить отчёт"
        )}
      </Button>
    </form>
  )
}
