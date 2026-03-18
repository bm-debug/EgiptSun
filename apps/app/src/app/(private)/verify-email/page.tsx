"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

type VerifyStatus = "idle" | "verifying" | "success" | "error"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({ email: "", token: "" })
  const [status, setStatus] = useState<VerifyStatus>("idle")
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const email = searchParams.get("email")
    const token = searchParams.get("token")
    if (email && token) {
      setFormData({ email, token })
      void handleVerify(email, token, true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleVerify = async (emailOverride?: string, tokenOverride?: string, auto = false) => {
    const email = (emailOverride ?? formData.email).trim().toLowerCase()
    const token = (tokenOverride ?? formData.token).trim()

    if (!email || !token) {
      setMessage("Укажите email и токен из письма.")
      setStatus("error")
      return
    }

    setStatus("verifying")
    setMessage(auto ? "Подтверждаем email..." : null)

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, token }),
      })

      const data = (await response
        .json()
        .catch(() => ({}))) as { success?: boolean; error?: string }

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Не удалось подтвердить email")
      }

      setStatus("success")
      setMessage("Email подтверждён. Теперь вы можете войти в систему.")
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Не удалось подтвердить email")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleVerify()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Подтверждение email</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  status === "success"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : status === "error"
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-primary/30 bg-primary/5 text-primary"
                }`}
              >
                {message}
              </div>
            )}

            <div className="space-y-2 hidden">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
                autoComplete="email"
                required
                disabled={status === "verifying"}
              />
            </div>

            <div className="space-y-2 hidden">
              <Label htmlFor="token">Токен подтверждения</Label>
              <Input
                id="token"
                value={formData.token}
                onChange={(e) => setFormData((prev) => ({ ...prev, token: e.target.value }))}
                placeholder="Вставьте токен из письма"
                required
                disabled={status === "verifying"}
              />
            </div>

            <Button type="submit" className="w-full hidden" disabled={status === "verifying"}>
              {status === "verifying" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Подтверждаем...
                </>
              ) : (
                "Подтвердить email"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Уже подтвердили?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Войти
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


