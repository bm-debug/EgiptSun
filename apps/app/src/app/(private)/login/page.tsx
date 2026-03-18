"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { US, RU, SA } from "country-flag-icons/react/3x2"
import { Logo } from "@/components/misc/logo/logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DocumentDirection } from "@/packages/components/misc/document-direction"
import { LANGUAGES, PROJECT_SETTINGS } from "@/settings"
import { getStoredLocale, syncLocaleStorage } from "@/lib/getInitialLocale"

const FLAG_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  en: US,
  ru: RU,
  ar: SA,
}

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState<string | null>(null)
  const supportedLanguageCodes = LANGUAGES.map((l) => l.code)
  type LanguageCode = (typeof LANGUAGES)[number]["code"]

  const [locale, setLocale] = useState<LanguageCode>(() => {
    if (typeof window !== "undefined") {
      const storedLocale = getStoredLocale()
      if (supportedLanguageCodes.includes(storedLocale as LanguageCode)) {
        return storedLocale
      }
    }
    return (PROJECT_SETTINGS.defaultLanguage || 'en') as LanguageCode
  })
  const [translations, setTranslations] = useState<any>(null)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const forgot = searchParams.get("forgot")
    const email = searchParams.get("email")
    if (forgot === "1") {
      setForgotMode(true)
      if (email) {
        setFormData((prev) => ({ ...prev, email }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const response = await fetch(`/api/locales/${locale}`)
        if (!response.ok) {
          throw new Error(`Failed to load translations: ${response.status}`)
        }
        const translationsData = await response.json()
        setTranslations(translationsData)
      } catch (e) {
        console.error('Failed to load translations:', e)
        // Fallback: try dynamic import as backup
        try {
          let translationsModule
          try {
            translationsModule = await import(`@/packages/content/locales/${locale}.json`)
          } catch {
            translationsModule = await import("@/packages/content/locales/en.json")
          }
          setTranslations(translationsModule.default || translationsModule)
        } catch (fallbackError) {
          console.error('Fallback import also failed:', fallbackError)
        }
      }
    }
    loadTranslations()
  }, [locale])

  useEffect(() => {
    if (resendCooldown <= 0) {
      return
    }
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [resendCooldown])


  const handleLocaleChange = (newLocale: LanguageCode) => {
    setLocale(newLocale)
    syncLocaleStorage(newLocale)
  }

  const t = translations?.login || {
    title: "Login",
    description: "Enter your credentials to access the admin panel",
    email: "Email",
    password: "Password",
    emailPlaceholder: "admin@example.com",
    passwordPlaceholder: "••••••••",
    loginButton: "Login",
    loggingIn: "Logging in...",
    forgotPassword: "Forgot password?",
    resetTitle: "Password reset",
    resetDescription: "Enter your email and we will send you a reset link",
    sendResetLink: "Send reset link",
    sendingResetLink: "Sending...",
    backToLogin: "Back to login",
    resetEmailSent: "If an account exists for this email, a reset link has been sent.",
    errors: {
      apiNotFound: "API endpoint not found. Please ensure you are running the development server correctly.\n\nFor local development with Cloudflare Functions, use:\n  npm run dev:all\n\nThis will start both Next.js and Wrangler servers.",
      serverError: "Server error. Please try again later.",
      unexpectedResponse: "Server returned an unexpected response",
      invalidCredentials: "Invalid credentials",
      loginFailed: "Login failed",
      unknownError: "Unknown error"
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNeedsVerification(false)
    setResendSuccess(null)
    setResetSuccess(null)

    if (forgotMode) {
      const email = formData.email.trim().toLowerCase()
      if (!email) {
        setError((t.errors as any).emailRequired || t.errors.loginFailed)
        return
      }

      setResetLoading(true)
      try {
        await fetch("/api/auth/password-reset/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })
        setResetSuccess(t.resetEmailSent)
      } catch {
        setResetSuccess(t.resetEmailSent)
      } finally {
        setResetLoading(false)
      }
      return
    }

    setLoading(true)

    try {
      const normalizedFormData = {
        ...formData,
        email: formData.email.toLowerCase(),
      }
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalizedFormData),
      })

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        
        // If we get HTML or 404, the endpoint is not available
        if (response.status === 404 || (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<!doctype'))) {
          throw new Error(t.errors.apiNotFound)
        }
        
        throw new Error(
          response.status === 500
            ? t.errors.serverError
            : `${t.errors.unexpectedResponse} (${response.status})`
        )
      }

      const data: { 
        error?: string
        details?: string
        code?: string
        success?: boolean
        user?: {
          roles?: Array<{
            dataIn?: string | null
            [key: string]: any
          }>
        }
      } = await response.json()

      if (!response.ok) {
        if ((data as any)?.code === 'EMAIL_NOT_VERIFIED') {
          setNeedsVerification(true)
          setPendingEmail(formData.email)
          setError('Email не подтвержден. Проверьте почту и подтвердите адрес.')
          if ((data as any)?.resendAvailableAt) {
            const availableAt = new Date((data as any).resendAvailableAt).getTime()
            const seconds = Math.max(0, Math.ceil((availableAt - Date.now()) / 1000))
            setResendCooldown(seconds > 0 ? seconds : 60)
          } else {
            setResendCooldown(60)
          }
          return
        }
        if ((data as any)?.code === 'INVALID_CREDENTIALS' || data.error === 'Invalid credentials') {
          throw new Error((t.errors as any).invalidCredentials || data.error || t.errors.loginFailed)
        }
        
        // Log error details for debugging
        if (data.details) {
          console.error('[Login] Error details:', data.details)
        }
        
        // Use error message or fallback to loginFailed
        const errorMsg = data.error || t.errors.loginFailed
        throw new Error(errorMsg)
      }

      // Check if user has Administrator role
      const hasAdministratorRole = data.user?.roles?.some(
        (role) => role.name === 'Administrator'
      )

      // Redirect is determined only by the first assigned role.
      let redirectUrl = '/admin' // Default for admin
      const firstRole = data.user?.roles?.[0]

      if (firstRole?.dataIn) {
        try {
          const dataIn = typeof firstRole.dataIn === 'string'
            ? JSON.parse(firstRole.dataIn)
            : firstRole.dataIn

          if (dataIn?.auth_redirect_url && typeof dataIn.auth_redirect_url === 'string') {
            redirectUrl = dataIn.auth_redirect_url
          } else if (!hasAdministratorRole) {
            redirectUrl = '/'
          }
        } catch (e) {
          // Ignore JSON parse errors and use fallbacks.
          if (!hasAdministratorRole) {
            redirectUrl = '/'
          }
        }
      } else if (!hasAdministratorRole) {
        // No roles or first role has no redirect and user is not Administrator.
        redirectUrl = '/'
      }

      try {
        const meResponse = await fetch('/api/auth/me', { credentials: 'include' })
        if (meResponse.ok) {
          const meData = await meResponse.json() as { user?: { language?: string } }
          const userLanguage = meData.user?.language
          if (userLanguage && supportedLanguageCodes.includes(userLanguage as LanguageCode)) {
            syncLocaleStorage(userLanguage as LanguageCode)
          }
        }
      } catch {
        // Ignore locale sync errors, redirect should not be blocked.
      }

      // Redirect to determined URL
      console.log("redirectUrl", redirectUrl)
      // Use window.location for reliable redirect after login
      window.location.href = redirectUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.unknownError)
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    const targetEmail = (pendingEmail || formData.email).trim().toLowerCase()
    if (!targetEmail) {
      setError('Укажите email, чтобы отправить письмо повторно.')
      return
    }

    setResendLoading(true)
    setError(null)
    setResendSuccess(null)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: targetEmail }),
      })

      const data = (await response
        .json()
        .catch(() => ({}))) as { success?: boolean; error?: string; resendAvailableAt?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось отправить письмо повторно')
      }

      if (data.resendAvailableAt) {
        const targetTime = new Date(data.resendAvailableAt).getTime()
        const seconds = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000))
        setResendCooldown(seconds > 0 ? seconds : 60)
      } else {
        setResendCooldown(60)
      }
      setResendSuccess('Письмо для подтверждения отправлено повторно.')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.unknownError)
    } finally {
      setResendLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <DocumentDirection locale={locale}>
      <div className="flex min-h-screen items-center justify-center bg-background p-4" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="absolute top-4 end-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 shrink-0 px-2 border-0 focus:ring-0 focus:outline-none">
              {React.createElement(FLAG_MAP[locale] || US, { className: "w-4 h-3" })}
              <span className="sr-only">Change language</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleLocaleChange(lang.code)}
                disabled={locale === lang.code}
              >
                {lang.name} ({lang.shortName})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
        <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Link href="/" className="cursor-pointer">
              <Logo className="h-12" />
            </Link>
          </div>
          <CardTitle className="text-2xl text-center">{forgotMode ? t.resetTitle : t.title}</CardTitle>
          <CardDescription className="text-center">
            {forgotMode ? t.resetDescription : t.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive whitespace-pre-wrap">
                {error}
              </div>
            )}
            {resetSuccess ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary whitespace-pre-wrap">
                {resetSuccess}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">{t.email}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t.emailPlaceholder}
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            {!forgotMode ? (
              <div className="space-y-2">
                <Label htmlFor="password">{t.password}</Label>
                <div className="relative">
                  <button
                    type="button"
                    aria-label={t.password}
                    title={t.password}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute start-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted z-10"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t.passwordPlaceholder}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    autoComplete="current-password"
                    className="ps-10"
                  />
                </div>
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading || resetLoading}>
              {loading || resetLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {forgotMode ? t.sendingResetLink : t.loggingIn}
                </>
              ) : (
                forgotMode ? t.sendResetLink : t.loginButton
              )}
            </Button>

            <div className="flex justify-between text-sm">
              <button
                type="button"
                className="text-foreground hover:underline"
                onClick={() => {
                  setForgotMode((v) => !v)
                  setError(null)
                  setResetSuccess(null)
                }}
              >
                {forgotMode ? t.backToLogin : t.forgotPassword}
              </button>
            </div>

            {needsVerification && (
              <div className="space-y-2 rounded-lg border border-muted bg-muted/50 p-3 text-sm">
                <p className="text-foreground">Для входа подтвердите email. Отправим письмо повторно по запросу.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={resendLoading || resendCooldown > 0}
                  onClick={handleResendVerification}
                >
                  {resendLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Отправляем...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Отправить повторно через ${resendCooldown} c`
                  ) : (
                    'Отправить письмо повторно'
                  )}
                </Button>
                {resendSuccess && (
                  <p className="text-xs text-muted-foreground">{resendSuccess}</p>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
    </DocumentDirection>
  )
}


