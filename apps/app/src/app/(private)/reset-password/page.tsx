"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Eye, EyeOff, Dice6, Loader2 } from "lucide-react"
import { LANGUAGES } from "@/settings"
import { validatePassword } from "@/shared/password"

type LanguageCode = (typeof LANGUAGES)[number]["code"]

function generateRandomPassword(length = 16): string {
  const lower = "abcdefghijklmnopqrstuvwxyz"
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const digits = "0123456789"
  const special = "!@#$%^&*()-_=+[]{};:,.<>?"
  const all = lower + upper + digits + special

  const pick = (charset: string) => charset[Math.floor(Math.random() * charset.length)] || ""

  const chars: string[] = [pick(lower), pick(upper), pick(digits), pick(special)]
  const remaining = Math.max(0, length - chars.length)
  const bytes = new Uint8Array(remaining)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < remaining; i++) {
    chars.push(all[bytes[i] % all.length] as string)
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j] as string, chars[i] as string]
  }
  return chars.join("")
}

function SecretInput({
  id,
  name,
  label,
  value,
  onChange,
  rightAction,
  rightActionLabel,
  autoComplete,
}: {
  id: string
  name: string
  label: string
  value: string
  onChange: (next: string) => void
  rightAction?: () => void
  rightActionLabel?: string
  autoComplete?: string
}) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <button
          type="button"
          aria-label={label}
          title={label}
          onClick={() => setVisible((v) => !v)}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        {rightAction ? (
          <button
            type="button"
            aria-label={rightActionLabel || ""}
            title={rightActionLabel || ""}
            onClick={rightAction}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <Dice6 className="h-4 w-4" />
          </button>
        ) : null}
        <Input
          id={id}
          type={visible ? "text" : "password"}
          name={name}
          autoComplete={autoComplete}
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={[
            "pl-10",
            rightAction ? "pr-10" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const email = (searchParams.get("email") || "").trim().toLowerCase()
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
        const response = await fetch(`/api/locales/${locale}`)
        if (response.ok) {
          setTranslations(await response.json())
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

  const t = translations?.passwordReset || {
    title: "Reset password",
    description: "Set a new password for your account",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    submit: "Save new password",
    submitting: "Saving...",
    backToLogin: "Back to login",
    generate: "Generate password",
    errors: {
      invalidLink: "Invalid reset link",
      required: "All fields are required",
      mismatch: "Passwords do not match",
      weak: "Password must be at least 8 characters",
      failed: "Failed to reset password",
    },
    success: {
      title: "Success",
      message: "Password was updated. You can now sign in.",
    },
  }

  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const canSubmit = React.useMemo(() => {
    if (!email || !token) return false
    if (!newPassword || !confirmPassword) return false
    if (newPassword !== confirmPassword) return false
    return validatePassword(newPassword).valid
  }, [email, token, newPassword, confirmPassword])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !token) {
      setError(t.errors.invalidLink)
      return
    }
    if (!newPassword || !confirmPassword) {
      setError(t.errors.required)
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t.errors.mismatch)
      return
    }
    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      const localized = newPassword.length < 8 ? t.errors.weak : null
      setError(localized || validation.error || t.errors.weak)
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      })
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || t.errors.failed)
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.failed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">{t.title}</CardTitle>
          <CardDescription className="text-center">{t.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <Alert className="mb-4">
              <AlertTitle>{t.success.title}</AlertTitle>
              <AlertDescription>{t.success.message}</AlertDescription>
            </Alert>
          ) : null}

          {!success ? (
            <form onSubmit={submit} className="space-y-4">
              <SecretInput
                id="newPassword"
                name="field-new"
                label={t.newPassword}
                value={newPassword}
                autoComplete="new-password"
                rightAction={() => {
                  const next = generateRandomPassword(16)
                  setNewPassword(next)
                  setConfirmPassword(next)
                }}
                rightActionLabel={t.generate}
                onChange={setNewPassword}
              />
              <SecretInput
                id="confirmPassword"
                name="field-confirm"
                label={t.confirmPassword}
                value={confirmPassword}
                autoComplete="new-password"
                onChange={setConfirmPassword}
              />
              <Button type="submit" className="w-full" disabled={loading || !canSubmit}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.submitting}
                  </>
                ) : (
                  t.submit
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">
                  {t.backToLogin}
                </Link>
              </p>
            </form>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">
                {t.backToLogin}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


