"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { LANGUAGES } from "@/settings"

type LanguageCode = (typeof LANGUAGES)[number]["code"]

type Status = "idle" | "loading" | "success" | "error"

export default function ConfirmEmailChangePage() {
  const searchParams = useSearchParams()
  const userUuid = (searchParams.get("u") || "").trim()
  const token = (searchParams.get("token") || "").trim()

  const supportedLanguageCodes = React.useMemo(() => LANGUAGES.map((l) => l.code), [])
  const [locale, setLocale] = React.useState<LanguageCode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-locale")
      if (saved && supportedLanguageCodes.includes(saved as LanguageCode)) return saved as LanguageCode
    }
    return (LANGUAGES[0]?.code || "en") as LanguageCode
  })
  const [translations, setTranslations] = React.useState<any>(null)

  React.useEffect(() => {
    const loadTranslations = async () => {
      try {
        const res = await fetch(`/api/locales/${locale}`)
        if (res.ok) {
          setTranslations(await res.json())
          return
        }
      } catch {
        // ignore
      }
      try {
        const module = await import(`@/packages/content/locales/${locale}.json`)
        setTranslations(module.default || module)
      } catch {
        const module = await import("@/packages/content/locales/en.json")
        setTranslations(module.default || module)
      }
    }
    void loadTranslations()
  }, [locale])

  React.useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent).detail as string
      if (supportedLanguageCodes.includes(next as LanguageCode)) setLocale(next as LanguageCode)
    }
    window.addEventListener("sidebar-locale-changed", handler as any)
    return () => window.removeEventListener("sidebar-locale-changed", handler as any)
  }, [supportedLanguageCodes])

  const t = translations?.confirmEmailChange || {
    title: "Confirm email change",
    description: "We are confirming your new email address…",
    successTitle: "Success",
    successMessage: "Email was updated. Please sign in again.",
    errorTitle: "Error",
    errorMessage: "Failed to confirm email change.",
    backToLogin: "Back to login",
  }

  const [status, setStatus] = React.useState<Status>("idle")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const didConfirmRef = React.useRef(false)

  React.useEffect(() => {
    const run = async () => {
      if (didConfirmRef.current) return
      didConfirmRef.current = true

      if (!userUuid || !token) {
        setStatus("error")
        setErrorMessage(t.errorMessage)
        return
      }
      setStatus("loading")
      setErrorMessage(null)
      try {
        const res = await fetch("/api/auth/confirm-email-change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userUuid, token }),
        })
        const json = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null
        if (!res.ok || !json?.success) {
          throw new Error(t.errorMessage)
        }
        setStatus("success")
      } catch (e) {
        setStatus("error")
        setErrorMessage(e instanceof Error ? e.message : t.errorMessage)
      }
    }

    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userUuid, token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">{t.title}</CardTitle>
          <CardDescription className="text-center">{t.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.description}
            </div>
          ) : null}

          {status === "success" ? (
            <Alert>
              <AlertTitle>{t.successTitle}</AlertTitle>
              <AlertDescription>{t.successMessage}</AlertDescription>
            </Alert>
          ) : null}

          {status === "error" ? (
            <Alert variant="destructive">
              <AlertTitle>{t.errorTitle}</AlertTitle>
              <AlertDescription>{errorMessage || t.errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <Button asChild className="w-full">
            <Link href="/login">{t.backToLogin}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


