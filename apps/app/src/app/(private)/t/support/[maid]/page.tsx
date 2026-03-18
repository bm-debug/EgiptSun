"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Send } from "lucide-react"
interface Message {
  uuid: string
  dataIn?: { content?: string; sender_role?: string; humanHaid?: string }
  createdAt?: string
}

export default function TesterSupportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const maid = params.maid as string
  const [chat, setChat] = React.useState<{ title?: string; dataIn?: { subject?: string }; statusName?: string } | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sending, setSending] = React.useState(false)
  const [messageContent, setMessageContent] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const fetchChat = React.useCallback(async () => {
    if (!maid) return
    try {
      setLoading(true)
      const res = await fetch(`/api/altrp/v1/t/support/${maid}`, { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load")
      const json = (await res.json()) as {
        data?: { chat?: { title?: string; dataIn?: { subject?: string }; statusName?: string }; messages?: Message[] }
      }
      if (json.data) {
        setChat(json.data.chat ?? null)
        setMessages(json.data.messages || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка")
    } finally {
      setLoading(false)
    }
  }, [maid])

  React.useEffect(() => {
    fetchChat()
  }, [fetchChat])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageContent.trim()) return
    setSending(true)
    try {
      const formData = new FormData()
      formData.append("chatMaid", maid)
      formData.append("content", messageContent.trim())
      formData.append("messageType", "text")
      const res = await fetch("/api/altrp/v1/t/support/messages", {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      if (!res.ok) throw new Error("Failed to send")
      setMessageContent("")
      await fetchChat()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !chat) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error || "Обращение не найдено"}</p>
        <Button variant="outline" asChild>
          <Link href="/t/support">Назад</Link>
        </Button>
      </div>
    )
  }

  const subject = chat.dataIn?.subject || chat.title || "Обращение"

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/t/support">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{subject}</h1>
          <Badge variant="secondary" className="mt-1">
            {chat.statusName || "—"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Переписка</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет сообщений</p>
            ) : (
              messages.map((msg) => {
                const content = msg.dataIn?.content || ""
                const isFromClient = msg.dataIn?.sender_role !== "admin"
                return (
                  <div
                    key={msg.uuid}
                    className={`flex ${isFromClient ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isFromClient ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{content}</p>
                      {msg.createdAt && (
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.createdAt).toLocaleString("ru-RU")}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <form onSubmit={handleSend} className="flex gap-2">
            <Textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Введите сообщение..."
              rows={2}
              className="resize-none"
              disabled={sending}
            />
            <Button type="submit" disabled={sending || !messageContent.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
