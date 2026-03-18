"use client"

import * as React from "react"
import { AdminHeader } from "@/packages/components/blocks-app/app-admin/AdminHeader"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Eye, EyeOff, Dice6, KeyRound, Loader2, Mail, Monitor, Smartphone, X, RotateCcw } from "lucide-react"
import { LANGUAGES, PROJECT_SETTINGS } from "@/settings"
import { validatePassword } from "@/shared/password"
import { formatLocalDateTime } from "@/shared/utils/date-format"
import { JOURNAL_ACTION_NAMES } from "@/shared/constants/journal-actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/packages/components/ui/select"
import Link from "next/link"

type AdminProfile = {
  id: string
  uuid: string
  email: string
  name: string
  firstName?: string
  lastName?: string
  middleName?: string
  avatarMediaUuid?: string
}

type UserSessionItem = {
  uuid: string
  userAgent: string | null
  ip: string | null
  region: string | null
  lastSeenAt: string | null
  expiresAt: string | null
  device: "mobile" | "desktop"
  isCurrent: boolean
}

type ArchivedSessionItem = {
  uuid: string
  userAgent: string | null
  ip: string | null
  region: string | null
  lastSeenAt: string | null
  revokedAt: string | null
  expiresAt: string | null
  device: "mobile" | "desktop"
}

type JournalRow = {
  id: number
  uuid: string
  action: string
  details: any
  createdAt?: string | null
}

function formatTimestamp(value?: string | null): string {
  if (!value) return ""
  return String(value)
    .replace("T", " ")
    .replace(/\.\d+(Z)?$/, "")
    .replace(/Z$/, "")
}

function parseUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) return "Unknown device"
  
  const ua = userAgent.toLowerCase()
  
  if (ua.includes("iphone")) {
    const versionMatch = userAgent.match(/OS (\d+)_(\d+)/i)
    const iosVersion = versionMatch ? `iOS ${versionMatch[1]}.${versionMatch[2]}` : "iOS"
    if (ua.includes("safari")) return `iPhone Safari (${iosVersion})`
    if (ua.includes("chrome")) return `iPhone Chrome (${iosVersion})`
    return `iPhone (${iosVersion})`
  }
  
  if (ua.includes("ipad")) {
    const versionMatch = userAgent.match(/OS (\d+)_(\d+)/i)
    const iosVersion = versionMatch ? `iOS ${versionMatch[1]}.${versionMatch[2]}` : "iOS"
    if (ua.includes("safari")) return `iPad Safari (${iosVersion})`
    if (ua.includes("chrome")) return `iPad Chrome (${iosVersion})`
    return `iPad (${iosVersion})`
  }
  
  if (ua.includes("android")) {
    const versionMatch = userAgent.match(/Android (\d+(?:\.\d+)?)/i)
    const androidVersion = versionMatch ? versionMatch[1] : ""
    if (ua.includes("chrome")) return `Android Chrome${androidVersion ? ` (${androidVersion})` : ""}`
    if (ua.includes("samsungbrowser")) return `Samsung Internet${androidVersion ? ` (${androidVersion})` : ""}`
    if (ua.includes("firefox")) return `Android Firefox${androidVersion ? ` (${androidVersion})` : ""}`
    return `Android${androidVersion ? ` (${androidVersion})` : ""}`
  }
  
  if (ua.includes("chrome") && !ua.includes("edg")) {
    const versionMatch = userAgent.match(/Chrome\/(\d+)/i)
    const chromeVersion = versionMatch ? versionMatch[1] : ""
    if (ua.includes("windows")) return `Chrome${chromeVersion ? ` ${chromeVersion}` : ""} on Windows`
    if (ua.includes("mac")) return `Chrome${chromeVersion ? ` ${chromeVersion}` : ""} on macOS`
    if (ua.includes("linux")) return `Chrome${chromeVersion ? ` ${chromeVersion}` : ""} on Linux`
    return `Chrome${chromeVersion ? ` ${chromeVersion}` : ""}`
  }
  
  if (ua.includes("safari") && !ua.includes("chrome") && !ua.includes("iphone") && !ua.includes("ipad")) {
    const versionMatch = userAgent.match(/Version\/(\d+(?:\.\d+)?)/i)
    const safariVersion = versionMatch ? versionMatch[1] : ""
    if (ua.includes("mac")) return `Safari${safariVersion ? ` ${safariVersion}` : ""} on macOS`
    return `Safari${safariVersion ? ` ${safariVersion}` : ""}`
  }
  
  if (ua.includes("firefox")) {
    const versionMatch = userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/i)
    const firefoxVersion = versionMatch ? versionMatch[1] : ""
    if (ua.includes("windows")) return `Firefox${firefoxVersion ? ` ${firefoxVersion}` : ""} on Windows`
    if (ua.includes("mac")) return `Firefox${firefoxVersion ? ` ${firefoxVersion}` : ""} on macOS`
    if (ua.includes("linux")) return `Firefox${firefoxVersion ? ` ${firefoxVersion}` : ""} on Linux`
    return `Firefox${firefoxVersion ? ` ${firefoxVersion}` : ""}`
  }
  
  if (ua.includes("edg")) {
    const versionMatch = userAgent.match(/Edg\/(\d+)/i)
    const edgeVersion = versionMatch ? versionMatch[1] : ""
    if (ua.includes("windows")) return `Edge${edgeVersion ? ` ${edgeVersion}` : ""} on Windows`
    if (ua.includes("mac")) return `Edge${edgeVersion ? ` ${edgeVersion}` : ""} on macOS`
    return `Edge${edgeVersion ? ` ${edgeVersion}` : ""}`
  }
  
  if (ua.includes("opera") || ua.includes("opr")) return "Opera"
  if (ua.includes("yandex")) return "Yandex Browser"
  if (ua.includes("brave")) return "Brave"
  
  return userAgent.length > 50 ? `${userAgent.substring(0, 50)}...` : userAgent
}

type LanguageCode = (typeof LANGUAGES)[number]["code"]

function parseFullNameToParts(fullName: string): { firstName: string; lastName: string; middleName: string } {
  const raw = (fullName || "").trim()
  if (!raw) return { firstName: "", lastName: "", middleName: "" }

  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return { firstName: parts[0], lastName: "", middleName: "" }

  const hasCyrillic = /[А-Яа-яЁё]/.test(raw)
  if (hasCyrillic) {
    return {
      lastName: parts[0] || "",
      firstName: parts[1] || "",
      middleName: parts.slice(2).join(" "),
    }
  }
  return {
    firstName: parts[0] || "",
    lastName: parts[1] || "",
    middleName: parts.slice(2).join(" "),
  }
}

function getInitials(firstName?: string, lastName?: string, name?: string, email?: string): string {
  const fn = (firstName || "").trim()
  const ln = (lastName || "").trim()
  if (fn || ln) {
    return ((fn[0] || "") + (ln[0] || "")).toUpperCase() || (fn.slice(0, 2) || "U").toUpperCase()
  }

  const source = (name || "").trim() || (email || "").trim()
  if (!source) return "U"

  const parts = source
    .replace(/[@._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function generateRandomPassword(length = 16): string {
  const lower = "abcdefghijklmnopqrstuvwxyz"
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const digits = "0123456789"
  const special = "!@#$%^&*()-_=+[]{};:,.<>?"
  const all = lower + upper + digits + special

  const pick = (charset: string) => charset[Math.floor(Math.random() * charset.length)] || ""

  const chars: string[] = [
    pick(lower),
    pick(upper),
    pick(digits),
    pick(special),
  ]

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
  value,
  onChange,
  placeholder,
  leftIconLabel,
  rightAction,
  rightActionLabel,
  name,
  autoComplete,
  variant = "password",
}: {
  id: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  leftIconLabel: string
  rightAction?: () => void
  rightActionLabel?: string
  name: string
  autoComplete?: string
  variant?: "password" | "maskedText"
}) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={leftIconLabel}
        title={leftIconLabel}
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
        type={variant === "password" ? (visible ? "text" : "password") : "text"}
        name={name}
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        {...(variant === "maskedText"
          ? {
              "data-lpignore": "true",
              "data-1p-ignore": "true",
              "data-form-type": "other",
            }
          : {})}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "pl-10",
          rightAction ? "pr-10" : "",
          variant === "maskedText" && !visible ? "[-webkit-text-security:disc]" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      />
    </div>
  )
}

export default function ManagerProfilePageClient() {
  const [profile, setProfile] = React.useState<AdminProfile | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null)
  const [changingPassword, setChangingPassword] = React.useState(false)

  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
    middleName: "",
  })

  const [passwordData, setPasswordData] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [newEmail, setNewEmail] = React.useState("")
  const [emailChangeLoading, setEmailChangeLoading] = React.useState(false)
  const [emailChangeError, setEmailChangeError] = React.useState<string | null>(null)
  const [emailChangeSuccess, setEmailChangeSuccess] = React.useState<string | null>(null)

  const [sessions, setSessions] = React.useState<UserSessionItem[]>([])
  const [sessionsLoading, setSessionsLoading] = React.useState(false)
  const [sessionsError, setSessionsError] = React.useState<string | null>(null)

  const [archivedSessions, setArchivedSessions] = React.useState<ArchivedSessionItem[]>([])
  const [archivedSessionsLoading, setArchivedSessionsLoading] = React.useState(false)
  const [archivedSessionsError, setArchivedSessionsError] = React.useState<string | null>(null)

  const [journalRows, setJournalRows] = React.useState<JournalRow[]>([])
  const [journalLoading, setJournalLoading] = React.useState(false)
  const [journalError, setJournalError] = React.useState<string | null>(null)
  const [journalPage, setJournalPage] = React.useState(1)
  const [journalPageSize] = React.useState(10)
  const [journalTotalPages, setJournalTotalPages] = React.useState(1)
  
  const [journalActionFilter, setJournalActionFilter] = React.useState<string>("all")
  const [journalDateFrom, setJournalDateFrom] = React.useState<string | null>(null)
  const [journalDateTo, setJournalDateTo] = React.useState<string | null>(null)
  const [journalPageFilter, setJournalPageFilter] = React.useState<string>("")

  const supportedLanguageCodes = React.useMemo(() => LANGUAGES.map((l) => l.code), [])
  const [locale, setLocale] = React.useState<LanguageCode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-locale")
      if (saved && supportedLanguageCodes.includes(saved as LanguageCode)) {
        return saved as LanguageCode
      }
    }
    const defaultLang = PROJECT_SETTINGS.defaultLanguage
    if (supportedLanguageCodes.includes(defaultLang as LanguageCode)) {
      return defaultLang as LanguageCode
    }
    return LANGUAGES[0]?.code || ("en" as LanguageCode)
  })

  const [translations, setTranslations] = React.useState<any>(null)

  React.useEffect(() => {
    const handleLocaleChanged = (e: StorageEvent | CustomEvent) => {
      const newLocale = (e as CustomEvent).detail || (e as StorageEvent).newValue
      if (newLocale && supportedLanguageCodes.includes(newLocale as LanguageCode)) {
        setLocale(newLocale as LanguageCode)
      }
    }

    window.addEventListener("storage", handleLocaleChanged as EventListener)
    window.addEventListener("sidebar-locale-changed", handleLocaleChanged as EventListener)
    return () => {
      window.removeEventListener("storage", handleLocaleChanged as EventListener)
      window.removeEventListener("sidebar-locale-changed", handleLocaleChanged as EventListener)
    }
  }, [supportedLanguageCodes])

  React.useEffect(() => {
    const loadTranslations = async () => {
      try {
        const cacheKey = `sidebar-translations-${locale}`
        const cached = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null
        if (cached) {
          try {
            setTranslations(JSON.parse(cached))
          } catch {
            // ignore
          }
        }
        const res = await fetch(`/api/locales/${locale}`)
        if (!res.ok) throw new Error(`Failed to load translations: ${res.status}`)
        const json = await res.json()
        setTranslations(json)
        if (typeof window !== "undefined") sessionStorage.setItem(cacheKey, JSON.stringify(json))
      } catch {
        try {
          const res = await fetch(`/api/locales/en`)
          if (!res.ok) return
          const json = await res.json()
          setTranslations(json)
        } catch {
          // ignore
        }
      }
    }
    void loadTranslations()
  }, [locale])

  const tProfile = React.useMemo(() => {
    const p = translations?.profile
    return (
      p || {
        title: "Profile",
        tabs: { personal: "Personal", security: "Security" },
        fields: {
          avatar: "Avatar",
          firstName: "First name",
          lastName: "Last name",
          middleName: "Middle name",
          email: "Email",
          currentPassword: "Current password",
          newPassword: "New password",
          confirmPassword: "Confirm new password",
        },
        actions: {
          save: "Save",
          saving: "Saving...",
          changePassword: "Change password",
          changing: "Saving...",
          requestEmailChange: "Send verification link",
          removeAvatar: "Remove avatar",
          removing: "Removing...",
        },
        email: {
          title: "Change email",
          newEmail: "New email",
          description: "We will send a verification link to your new email address.",
          success: "Verification link sent to the new email.",
          errors: {
            invalid: "Please enter a valid email.",
            sameAsCurrent: "New email must be different from current email.",
            failed: "Failed to request email change.",
          },
        },
        alerts: { errorTitle: "Error", successTitle: "Success" },
        messages: { profileUpdated: "Profile updated", avatarUpdated: "Avatar updated", passwordUpdated: "Password updated" },
        errors: {
          loadProfile: "Failed to load profile",
          updateProfile: "Failed to update profile",
          uploadAvatar: "Failed to upload avatar",
          removeAvatar: "Failed to remove avatar",
          changePassword: "Failed to change password",
          required: "All fields are required",
          mismatch: "Passwords do not match",
        },
      }
    )
  }, [translations])

  const requestEmailChange = async () => {
    setEmailChangeLoading(true)
    setEmailChangeError(null)
    setEmailChangeSuccess(null)
    try {
      const next = newEmail.trim()
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)
      if (!isValidEmail) {
        setEmailChangeError(tProfile.email?.errors?.invalid || "Invalid email")
        return
      }
      if (profile?.email && next.toLowerCase() === profile.email.toLowerCase()) {
        setEmailChangeError(tProfile.email?.errors?.sameAsCurrent || "Email is same")
        return
      }

      const res = await fetch("/api/altrp/v1/admin/profile/change-email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newEmail: next, locale }),
      })
      const json = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || tProfile.email?.errors?.failed || "Failed")
      }
      setEmailChangeSuccess(tProfile.email?.success || "Sent")
      setTimeout(() => setEmailChangeSuccess(null), 2500)
    } catch (e) {
      setEmailChangeError(e instanceof Error ? e.message : tProfile.email?.errors?.failed || "Failed")
    } finally {
      setEmailChangeLoading(false)
    }
  }

  const emailChangeI18n = translations?.profile?.email as any
  const emailChangeActionLabel = translations?.profile?.actions?.requestEmailChange as string | undefined
  const emailChangeSectionReady = Boolean(emailChangeI18n && emailChangeActionLabel)

  const isNewEmailValid = React.useMemo(() => {
    const next = newEmail.trim()
    if (!next) return false
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)
    if (!isValidEmail) return false
    if (profile?.email && next.toLowerCase() === profile.email.toLowerCase()) return false
    return true
  }, [newEmail, profile?.email])

  const newEmailValidationMessage = React.useMemo(() => {
    const next = newEmail.trim()
    if (!next) return null
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)
    if (!isValidEmail) return emailChangeI18n?.errors?.invalid || null
    if (profile?.email && next.toLowerCase() === profile.email.toLowerCase()) {
      return emailChangeI18n?.errors?.sameAsCurrent || null
    }
    return null
  }, [newEmail, profile?.email, emailChangeI18n])

  const fetchProfile = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/altrp/v1/admin/profile", { credentials: "include" })
      if (!res.ok) throw new Error(tProfile.errors.loadProfile)
      const json = (await res.json()) as { profile: AdminProfile }
      setProfile(json.profile)
      const parsed = parseFullNameToParts(json.profile.name || "")
      setFormData({
        firstName: json.profile.firstName || parsed.firstName || "",
        lastName: json.profile.lastName || parsed.lastName || "",
        middleName: json.profile.middleName || parsed.middleName || "",
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : tProfile.errors.loadProfile)
    } finally {
      setLoading(false)
    }
  }, [tProfile.errors.loadProfile])

  const fetchSessions = React.useCallback(async () => {
    setSessionsLoading(true)
    setSessionsError(null)
    try {
      const res = await fetch("/api/altrp/v1/admin/profile/sessions", { credentials: "include" })
      const json = (await res.json().catch(() => null)) as { success?: boolean; sessions?: UserSessionItem[]; message?: string } | null
      if (!res.ok || !json?.success) {
        throw new Error(
          json?.message ||
            (translations?.profile?.activity?.sessions?.loadError as string) ||
            "Failed to load sessions"
        )
      }
      setSessions(Array.isArray(json.sessions) ? json.sessions : [])
    } catch (e) {
      setSessionsError(
        e instanceof Error
          ? e.message
          : (translations?.profile?.activity?.sessions?.loadError as string) || "Failed to load sessions"
      )
    } finally {
      setSessionsLoading(false)
    }
  }, [translations?.profile?.activity?.sessions?.loadError])

  const fetchArchivedSessions = React.useCallback(async () => {
    setArchivedSessionsLoading(true)
    setArchivedSessionsError(null)
    try {
      const res = await fetch("/api/altrp/v1/admin/profile/sessions/archived", { credentials: "include" })
      const json = (await res.json().catch(() => null)) as { success?: boolean; sessions?: ArchivedSessionItem[]; message?: string } | null
      if (!res.ok || !json?.success) {
        throw new Error(
          json?.message ||
            (translations?.profile?.activity?.sessions?.archivedLoadError as string) ||
            "Failed to load archived sessions"
        )
      }
      setArchivedSessions(Array.isArray(json.sessions) ? json.sessions : [])
    } catch (e) {
      setArchivedSessionsError(
        e instanceof Error
          ? e.message
          : (translations?.profile?.activity?.sessions?.archivedLoadError as string) || "Failed to load archived sessions"
      )
    } finally {
      setArchivedSessionsLoading(false)
    }
  }, [translations?.profile?.activity?.sessions?.archivedLoadError])

  const revokeSession = React.useCallback(async (sessionUuid: string, isCurrent: boolean) => {
    try {
      await fetch("/api/altrp/v1/admin/profile/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionUuid }),
      })
    } finally {
      if (isCurrent) {
        window.location.href = "/login"
        return
      }
      void fetchSessions()
      void fetchArchivedSessions()
    }
  }, [fetchSessions, fetchArchivedSessions])

  const journalQueryParams = React.useMemo(() => {
    const params = new URLSearchParams()
    params.set("p", String(journalPage))
    params.set("ps", String(journalPageSize))
    if (journalActionFilter && journalActionFilter !== "all") {
      params.set("action", journalActionFilter)
    }
    if (journalDateFrom) {
      params.set("dateFrom", journalDateFrom)
    }
    if (journalDateTo) {
      params.set("dateTo", journalDateTo)
    }
    if (journalPageFilter.trim()) {
      params.set("page", journalPageFilter.trim())
    }
    return params.toString()
  }, [journalPage, journalPageSize, journalActionFilter, journalDateFrom, journalDateTo, journalPageFilter])

  const fetchJournals = React.useCallback(async () => {
    setJournalLoading(true)
    setJournalError(null)
    try {
      const res = await fetch(`/api/altrp/v1/admin/profile/journals?${journalQueryParams}`, {
        credentials: "include",
      })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok || !json?.success) {
        throw new Error(
          json?.message ||
            (translations?.profile?.activity?.journal?.loadError as string) ||
            "Failed to load activity"
        )
      }
      setJournalRows((json.docs || []) as JournalRow[])
      setJournalTotalPages(Number(json.pagination?.totalPages || 1))
    } catch (e) {
      setJournalError(
        e instanceof Error
          ? e.message
          : (translations?.profile?.activity?.journal?.loadError as string) || "Failed to load activity"
      )
    } finally {
      setJournalLoading(false)
    }
  }, [journalQueryParams, translations?.profile?.activity?.journal?.loadError])

  React.useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  React.useEffect(() => {
    void fetchSessions()
  }, [fetchSessions])

  React.useEffect(() => {
    void fetchArchivedSessions()
  }, [fetchArchivedSessions])

  React.useEffect(() => {
    void fetchJournals()
  }, [fetchJournals])
  
  React.useEffect(() => {
    setJournalPage(1)
  }, [journalActionFilter, journalDateFrom, journalDateTo, journalPageFilter])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/altrp/v1/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          middleName: formData.middleName.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(json?.message || tProfile.errors.updateProfile)
      }
      setSuccess(tProfile.messages.profileUpdated)
      await fetchProfile()
      setTimeout(() => setSuccess(null), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : tProfile.errors.updateProfile)
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (file: File) => {
    setUploading(true)
    setError(null)
    setSuccess(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/altrp/v1/admin/profile/avatar", {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(json?.message || tProfile.errors.uploadAvatar)
      }
      const json = (await res.json().catch(() => null)) as { avatarMediaUuid?: string } | null
      setSuccess(tProfile.messages.avatarUpdated)
      await fetchProfile()
      setTimeout(() => setSuccess(null), 2500)

      try {
        const avatarMediaUuid = json?.avatarMediaUuid
        if (avatarMediaUuid && typeof window !== "undefined") {
          const cachedUser = sessionStorage.getItem("sidebar-user")
          if (cachedUser) {
            const parsed = JSON.parse(cachedUser)
            const next = {
              ...parsed,
              avatarUrl: `/api/altrp/v1/media/${avatarMediaUuid}`,
            }
            sessionStorage.setItem("sidebar-user", JSON.stringify(next))
            window.dispatchEvent(new CustomEvent("sidebar-user-updated", { detail: next }))
          } else {
            window.dispatchEvent(
              new CustomEvent("sidebar-user-updated", {
                detail: { avatarUrl: `/api/altrp/v1/media/${avatarMediaUuid}` },
              }),
            )
          }
        }
      } catch {
        // ignore
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : tProfile.errors.uploadAvatar)
    } finally {
      setUploading(false)
    }
  }

  const handleAvatarRemove = async () => {
    setUploading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/altrp/v1/admin/profile/avatar", {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(json?.message || tProfile.errors.removeAvatar)
      }
      setSuccess(tProfile.messages.avatarUpdated)
      await fetchProfile()
      setTimeout(() => setSuccess(null), 2500)

      if (typeof window !== "undefined") {
        const cachedUser = sessionStorage.getItem("sidebar-user")
        if (cachedUser) {
          const parsed = JSON.parse(cachedUser)
          const next = { ...parsed, avatarUrl: null }
          sessionStorage.setItem("sidebar-user", JSON.stringify(next))
          window.dispatchEvent(new CustomEvent("sidebar-user-updated", { detail: next }))
        } else {
          window.dispatchEvent(new CustomEvent("sidebar-user-updated", { detail: { avatarUrl: null } }))
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : tProfile.errors.removeAvatar)
    } finally {
      setUploading(false)
    }
  }

  const handlePasswordChange = async () => {
    setChangingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(null)
    try {
      const validation = validatePassword(passwordData.newPassword)
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        setPasswordError(tProfile.errors.required)
        return
      }
      if (!validation.valid) {
        const localized =
          passwordData.newPassword.length < 8
            ? (tProfile.errors as any).passwordTooShort
            : null
        setPasswordError(localized || validation.error || tProfile.errors.changePassword)
        return
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError(tProfile.errors.mismatch)
        return
      }
      const res = await fetch("/api/altrp/v1/admin/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(json?.message || tProfile.errors.changePassword)
      }
      setPasswordSuccess(tProfile.messages.passwordUpdated)
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setTimeout(() => setPasswordSuccess(null), 2500)
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : tProfile.errors.changePassword)
      setPasswordSuccess(null)
    } finally {
      setChangingPassword(false)
    }
  }

  const canChangePassword = React.useMemo(() => {
    if (!passwordData.currentPassword) return false
    if (!passwordData.newPassword || !passwordData.confirmPassword) return false
    if (passwordData.newPassword !== passwordData.confirmPassword) return false
    return validatePassword(passwordData.newPassword).valid
  }, [passwordData.currentPassword, passwordData.newPassword, passwordData.confirmPassword])

  const avatarSrc = profile?.avatarMediaUuid ? `/api/altrp/v1/media/${profile.avatarMediaUuid}` : null
  const initials = React.useMemo(() => {
    return getInitials(formData.firstName, formData.lastName, profile?.name, profile?.email)
  }, [formData.firstName, formData.lastName, profile?.name, profile?.email])

  return (
    <>
      <AdminHeader title={tProfile.title} />
      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-6">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{tProfile.alerts.errorTitle}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {success ? (
              <Alert>
                <AlertTitle>{tProfile.alerts.successTitle}</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            ) : null}

            <Tabs defaultValue="personal" className="space-y-4">
              <TabsList className="bg-primary-foreground">
                <TabsTrigger className="data-[state=active]:bg-primary-foreground" value="personal">
                  {tProfile.tabs.personal}
                </TabsTrigger>
                <TabsTrigger className="data-[state=active]:bg-primary-foreground" value="security">
                  {tProfile.tabs.security}
                </TabsTrigger>
                <TabsTrigger className="data-[state=active]:bg-primary-foreground" value="activity">
                  {(tProfile.tabs as any).activity || "Activity"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{tProfile.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border">
                        {avatarSrc ? <AvatarImage src={avatarSrc} alt={tProfile.fields.avatar} /> : null}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-2 flex-1">
                        <Label htmlFor="avatar">{tProfile.fields.avatar}</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="avatar"
                            type="file"
                            accept="image/*"
                            disabled={uploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) void handleAvatarUpload(file)
                            }}
                          />
                          {profile?.avatarMediaUuid ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              disabled={uploading}
                              aria-label={tProfile.actions.removeAvatar}
                              title={tProfile.actions.removeAvatar}
                              onClick={() => void handleAvatarRemove()}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">{tProfile.fields.firstName}</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">{tProfile.fields.lastName}</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="middleName">{tProfile.fields.middleName}</Label>
                        <Input
                          id="middleName"
                          value={formData.middleName}
                          onChange={(e) => setFormData((p) => ({ ...p, middleName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="email">{tProfile.fields.email}</Label>
                        <Input id="email" value={profile?.email || ""} disabled />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={() => void handleSave()} disabled={saving}>
                        {saving ? tProfile.actions.saving : tProfile.actions.save}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{tProfile.tabs.security}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {passwordError ? (
                      <Alert variant="destructive">
                        <AlertTitle>{tProfile.alerts.errorTitle}</AlertTitle>
                        <AlertDescription>{passwordError}</AlertDescription>
                      </Alert>
                    ) : null}
                    {passwordSuccess ? (
                      <Alert>
                        <AlertTitle>{tProfile.alerts.successTitle}</AlertTitle>
                        <AlertDescription>{passwordSuccess}</AlertDescription>
                      </Alert>
                    ) : null}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="currentPassword">{tProfile.fields.currentPassword}</Label>
                        {translations?.profile?.actions?.forgotPassword ? (
                          <Link
                            href={`/login?forgot=1&email=${encodeURIComponent(profile?.email || "")}`}
                            className="text-xs text-primary hover:underline"
                          >
                            {translations.profile.actions.forgotPassword}
                          </Link>
                        ) : null}
                      </div>
                      <SecretInput
                        id="currentPassword"
                        name="currentPassword"
                        autoComplete="current-password"
                        value={passwordData.currentPassword}
                        leftIconLabel={tProfile.fields.currentPassword}
                        onChange={(next) => setPasswordData((p) => ({ ...p, currentPassword: next }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">{tProfile.fields.newPassword}</Label>
                      <SecretInput
                        id="newPassword"
                        name="newPassword"
                        autoComplete="off"
                        variant="maskedText"
                        value={passwordData.newPassword}
                        leftIconLabel={tProfile.fields.newPassword}
                        rightAction={() => {
                          const next = generateRandomPassword(16)
                          setPasswordData((p) => ({ ...p, newPassword: next, confirmPassword: next }))
                        }}
                        rightActionLabel={tProfile.actions.generatePassword || "Generate password"}
                        onChange={(next) => setPasswordData((p) => ({ ...p, newPassword: next }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{tProfile.fields.confirmPassword}</Label>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <SecretInput
                            id="confirmPassword"
                            name="confirmPassword"
                            autoComplete="off"
                            variant="maskedText"
                            value={passwordData.confirmPassword}
                            leftIconLabel={tProfile.fields.confirmPassword}
                            onChange={(next) => setPasswordData((p) => ({ ...p, confirmPassword: next }))}
                          />
                        </div>
                        <Button
                          className="w-full sm:w-auto"
                          onClick={() => void handlePasswordChange()}
                          disabled={changingPassword || !canChangePassword}
                        >
                          {changingPassword ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {tProfile.actions.changing}
                            </>
                          ) : (
                            <>
                              <KeyRound className="mr-2 h-4 w-4" />
                              {tProfile.actions.changePassword}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {emailChangeSectionReady ? (
                      <div className="pt-4 border-t">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{emailChangeI18n.title}</div>
                          <div className="text-xs text-muted-foreground">{emailChangeI18n.description}</div>
                        </div>
                        {emailChangeError ? (
                          <Alert variant="destructive" className="mt-3">
                            <AlertTitle>{tProfile.alerts.errorTitle}</AlertTitle>
                            <AlertDescription>{emailChangeError}</AlertDescription>
                          </Alert>
                        ) : null}
                        {emailChangeSuccess ? (
                          <Alert className="mt-3">
                            <AlertTitle>{tProfile.alerts.successTitle}</AlertTitle>
                            <AlertDescription>{emailChangeSuccess}</AlertDescription>
                          </Alert>
                        ) : null}
                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                          <div className="space-y-2">
                            <Label htmlFor="newEmail">{emailChangeI18n.newEmail}</Label>
                            <Input
                              id="newEmail"
                              type="email"
                              value={newEmail}
                              onChange={(e) => {
                                setNewEmail(e.target.value)
                                setEmailChangeError(null)
                                setEmailChangeSuccess(null)
                              }}
                              placeholder="name@example.com"
                              autoComplete="email"
                            />
                          </div>

                          <Button
                            type="button"
                            className="w-full sm:w-auto sm:self-end"
                            onClick={() => void requestEmailChange()}
                            disabled={emailChangeLoading || !isNewEmailValid}
                          >
                            {emailChangeLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {(translations?.profile?.actions as any)?.sendingEmailChange || tProfile.actions.changing}
                              </>
                            ) : (
                              <>
                                <Mail className="mr-2 h-4 w-4" />
                                {emailChangeActionLabel}
                              </>
                            )}
                          </Button>

                          <div className="min-h-4 text-xs text-destructive sm:col-start-1">
                            {newEmailValidationMessage || ""}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{(translations?.profile?.activity?.sessions?.title as string) || "Sessions"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="active" className="w-full">
                      <TabsList className="bg-primary-foreground">
                        <TabsTrigger value="active">
                          {(translations?.profile?.activity?.sessions?.activeTab as string) || "Active"}
                        </TabsTrigger>
                        <TabsTrigger value="archived">
                          {(translations?.profile?.activity?.sessions?.archivedTab as string) || "Archived"}
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="active" className="space-y-3 mt-4">
                        {sessionsError ? (
                          <Alert variant="destructive">
                            <AlertTitle>{tProfile.alerts.errorTitle}</AlertTitle>
                            <AlertDescription>{sessionsError}</AlertDescription>
                          </Alert>
                        ) : sessionsLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {(translations?.profile?.activity?.sessions?.loading as string) || "Loading..."}
                          </div>
                        ) : sessions.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            {(translations?.profile?.activity?.sessions?.empty as string) || "No active sessions"}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {sessions.map((s) => (
                              <div
                                key={s.uuid}
                                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between"
                              >
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className="mt-0.5 text-muted-foreground flex-shrink-0">
                                    {s.device === "mobile" ? (
                                      <Smartphone className="h-4 w-4" />
                                    ) : (
                                      <Monitor className="h-4 w-4" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                                      <span className="break-words break-all">
                                        {parseUserAgent(s.userAgent)}
                                      </span>
                                      {s.isCurrent ? (
                                        <span className="rounded bg-muted px-2 py-0.5 text-xs flex-shrink-0">
                                          {(translations?.profile?.activity?.sessions?.current as string) || "Current"}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground break-words">
                                      {s.ip ? `IP: ${s.ip}` : null}
                                      {(() => {
                                        const isLocalhost = s.ip === '127.0.0.1' || s.ip === 'localhost'
                                        const displayRegion = s.region === 'Localhost' 
                                          ? ((translations?.profile?.activity?.sessions?.local as string) || "Localhost")
                                          : (s.region || (isLocalhost ? ((translations?.profile?.activity?.sessions?.local as string) || "Localhost") : null))
                                        return displayRegion ? ` • ${(translations?.profile?.activity?.sessions?.region as string) || "Region"}: ${displayRegion}` : null
                                      })()}
                                      {s.lastSeenAt ? ` • ${(translations?.profile?.activity?.sessions?.lastSeen as string) || "Last seen"}: ${formatLocalDateTime(s.lastSeenAt, locale)}` : null}
                                    </div>
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full sm:w-auto flex-shrink-0 sm:ml-4"
                                  onClick={() => revokeSession(s.uuid, s.isCurrent)}
                                >
                                  {(translations?.profile?.activity?.sessions?.revoke as string) || "Close"}
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent value="archived" className="space-y-3 mt-4">
                        {archivedSessionsError ? (
                          <Alert variant="destructive">
                            <AlertTitle>{tProfile.alerts.errorTitle}</AlertTitle>
                            <AlertDescription>{archivedSessionsError}</AlertDescription>
                          </Alert>
                        ) : archivedSessionsLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {(translations?.profile?.activity?.sessions?.archivedLoading as string) || "Loading..."}
                          </div>
                        ) : archivedSessions.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            {(translations?.profile?.activity?.sessions?.archivedEmpty as string) || "No archived sessions"}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {archivedSessions.map((s) => (
                              <div
                                key={s.uuid}
                                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start"
                              >
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className="mt-0.5 text-muted-foreground flex-shrink-0">
                                    {s.device === "mobile" ? (
                                      <Smartphone className="h-4 w-4" />
                                    ) : (
                                      <Monitor className="h-4 w-4" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                                      <span className="break-words break-all">
                                        {parseUserAgent(s.userAgent)}
                                      </span>
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground break-words">
                                      {s.ip ? `IP: ${s.ip}` : null}
                                      {s.region ? ` • ${(translations?.profile?.activity?.sessions?.region as string) || "Region"}: ${s.region}` : null}
                                      {s.lastSeenAt ? ` • ${(translations?.profile?.activity?.sessions?.lastSeen as string) || "Last seen"}: ${formatLocalDateTime(s.lastSeenAt, locale)}` : null}
                                      {s.revokedAt ? ` • ${(translations?.profile?.activity?.sessions?.revokedAt as string) || "Revoked"}: ${formatLocalDateTime(s.revokedAt, locale)}` : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{(translations?.profile?.activity?.journal?.title as string) || "Activity"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {journalError ? (
                      <Alert variant="destructive">
                        <AlertTitle>{tProfile.alerts.errorTitle}</AlertTitle>
                        <AlertDescription>{journalError}</AlertDescription>
                      </Alert>
                    ) : null}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="sm:col-span-1">
                        <Label className="text-xs">
                          {(translations?.profile?.activity?.journal?.filters?.actionType as string) || "Action Type"}
                        </Label>
                        <Select value={journalActionFilter} onValueChange={setJournalActionFilter}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              {(translations?.profile?.activity?.journal?.filters?.allTypes as string) || "All Types"}
                            </SelectItem>
                            {Object.entries(JOURNAL_ACTION_NAMES).map(([value, label]) => {
                              const actionNames = (translations?.profile?.activity?.journal?.actionNames || {}) as Record<string, string>
                              const translatedLabel = actionNames[value] || label
                              return (
                                <SelectItem key={value} value={value}>
                                  {translatedLabel}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="sm:col-span-1">
                        <Label className="text-xs">
                          {(translations?.profile?.activity?.journal?.filters?.dateFrom as string) || "Date From"}
                        </Label>
                        <Input
                          type="date"
                          value={journalDateFrom || ""}
                          onChange={(e) => setJournalDateFrom(e.target.value || null)}
                          className="h-9"
                        />
                      </div>
                      
                      <div className="sm:col-span-1">
                        <Label className="text-xs">
                          {(translations?.profile?.activity?.journal?.filters?.dateTo as string) || "Date To"}
                        </Label>
                        <Input
                          type="date"
                          value={journalDateTo || ""}
                          onChange={(e) => setJournalDateTo(e.target.value || null)}
                          className="h-9"
                        />
                      </div>
                      
                      <div className="sm:col-span-1">
                        <Label className="text-xs">
                          {(translations?.profile?.activity?.journal?.filters?.page as string) || "Page"}
                        </Label>
                        <Input
                          type="text"
                          placeholder={(translations?.profile?.activity?.journal?.filters?.pagePlaceholder as string) || "Search by URL..."}
                          value={journalPageFilter}
                          onChange={(e) => setJournalPageFilter(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      
                      <div className="sm:col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setJournalActionFilter("all")
                            setJournalDateFrom(null)
                            setJournalDateTo(null)
                            setJournalPageFilter("")
                          }}
                          className="h-9 w-full"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          {(translations?.profile?.activity?.journal?.filters?.reset as string) || "Reset"}
                        </Button>
                      </div>
                    </div>

                    {journalLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {(translations?.profile?.activity?.journal?.loading as string) || "Loading..."}
                      </div>
                    ) : null}

                    {!journalLoading && journalRows.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        {(translations?.profile?.activity?.journal?.empty as string) || "No activity yet"}
                      </div>
                    ) : null}

                    {!journalLoading && journalRows.length ? (
                      <div className="space-y-2">
                        {journalRows.map((row) => {
                          const payload = row?.details?.payload
                          const url = payload?.url || payload?.pathname || null
                          const actionNames = (translations?.profile?.activity?.journal?.actionNames || {}) as Record<string, string>
                          const title = actionNames[row.action] || row.action
                          return (
                            <div key={row.uuid} className="rounded-lg border p-3">
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-medium">{title}</span>
                                <span className="text-muted-foreground">/</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatLocalDateTime(row.createdAt, locale)}
                                </span>
                                {url ? (
                                  <>
                                    <span className="text-muted-foreground">/</span>
                                    <span className="text-xs text-muted-foreground break-all">{String(url)}</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={journalPage <= 1}
                        onClick={() => setJournalPage((p) => Math.max(1, p - 1))}
                      >
                        {(translations?.profile?.activity?.journal?.prev as string) || "Prev"}
                      </Button>
                      <div className="text-xs text-muted-foreground">
                        {(translations?.profile?.activity?.journal?.page as string) || "Page"} {journalPage} / {journalTotalPages}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={journalPage >= journalTotalPages}
                        onClick={() => setJournalPage((p) => Math.min(journalTotalPages, p + 1))}
                      >
                        {(translations?.profile?.activity?.journal?.next as string) || "Next"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </>
  )
}






